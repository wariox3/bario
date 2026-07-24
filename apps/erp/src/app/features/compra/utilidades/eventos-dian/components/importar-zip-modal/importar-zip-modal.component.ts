import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { finalize, switchMap, throwError } from 'rxjs';
import { I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent } from '@reddoc/ui';
import { ContactoService } from '@erp/features/general/masters/contacto/contacto.service';
import type { ContactoPayload } from '@erp/features/general/masters/contacto/contacto.model';
import type { AppDict } from '@erp/i18n';
import {
  ImportarZipService,
  fileToBase64,
  type GuardarFacturaResponse,
} from '../../importar-zip.service';
import { construirPayloadFactura, type ImportarZipResponse } from '../../importar-zip.model';

/** Endpoints `seleccionar/` de los catálogos del paso de confirmación / proveedor. */
const ENDPOINTS = {
  formaPago: '/general/forma-pago/seleccionar/',
  almacen: '/inventario/almacen/seleccionar/',
  grupo: '/contabilidad/grupo/seleccionar/',
  ciudad: '/general/ciudad/seleccionar/',
  identificacion: '/general/identificacion/seleccionar/',
  plazoPago: '/general/plazo-pago/seleccionar/',
} as const;

/** Paso del wizard: 0 = archivo, 1 = proveedor, 2 = confirmar. */
type WizardStep = 0 | 1 | 2;

/**
 * Wizard **Importar ZIP** (Eventos DIAN, Compra).
 *
 * Modal de tres pasos que crea una factura de compra desde la factura
 * electrónica DIAN del proveedor:
 *  1. **Archivo** — sube el ZIP; el backend lo parsea.
 *  2. **Proveedor** — solo si el contacto no existe: mini-form pre-cargado del
 *     ZIP que crea el proveedor.
 *  3. **Confirmar** — defaults contables (forma de pago, almacén, grupo) +
 *     resumen del documento; guarda y aprueba la factura.
 *
 * Al terminar emite `saved` para que el host recargue la lista.
 */
@Component({
  selector: 'app-importar-zip-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
  ],
  templateUrl: './importar-zip-modal.component.html',
  styleUrl: './importar-zip-modal.component.scss',
})
export class ImportarZipModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ImportarZipService);
  private readonly contactoService = inject(ContactoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly endpoints = ENDPOINTS;

  readonly visible = model<boolean>(false);
  readonly saved = output<void>();

  // ── Estado del wizard ─────────────────────────────────────────────────────
  protected readonly step = signal<WizardStep>(0);
  protected readonly file = signal<File | null>(null);
  protected readonly importing = signal(false);
  protected readonly savingContacto = signal(false);
  protected readonly savingFactura = signal(false);
  protected readonly errorMsg = signal<string | null>(null);
  protected readonly response = signal<ImportarZipResponse | null>(null);
  private readonly contactoId = signal<number | null>(null);

  protected readonly documento = computed(() => this.response()?.documento ?? null);
  protected readonly contacto = computed(() => this.response()?.contacto ?? null);
  protected readonly fileName = computed(() => this.file()?.name ?? '');
  protected readonly fileSize = computed(() => {
    const f = this.file();
    return f ? `${(f.size / 1024).toFixed(2)} KB` : '';
  });
  protected readonly busy = computed(
    () => this.importing() || this.savingContacto() || this.savingFactura(),
  );

  // ── Formularios ───────────────────────────────────────────────────────────
  protected readonly proveedorForm = this.fb.group({
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: this.fb.nonNullable.control('', Validators.required),
    nombre_corto: this.fb.nonNullable.control('', Validators.required),
    ciudad: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    direccion: this.fb.nonNullable.control(''),
    correo: this.fb.nonNullable.control(''),
    plazo_pago: this.fb.control<ErpSelectOption | null>(null),
  });

  protected readonly confirmForm = this.fb.group({
    forma_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    almacen: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    grupo_contabilidad: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  // ── Paso 1: archivo ───────────────────────────────────────────────────────

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0] ?? null;
    if (selected) {
      this.file.set(selected);
      this.errorMsg.set(null);
    }
  }

  protected onFileDropped(event: DragEvent): void {
    event.preventDefault();
    const dropped = event.dataTransfer?.files?.[0] ?? null;
    if (dropped && dropped.name.toLowerCase().endsWith('.zip')) {
      this.file.set(dropped);
      this.errorMsg.set(null);
    }
  }

  protected removeFile(): void {
    this.file.set(null);
  }

  protected async importar(): Promise<void> {
    const f = this.file();
    if (!f || this.importing()) return;

    this.importing.set(true);
    this.errorMsg.set(null);
    let base64: string;
    try {
      base64 = await fileToBase64(f);
    } catch {
      this.importing.set(false);
      this.errorMsg.set(this.t().entities.eventosDian.importar.errors.read);
      return;
    }

    this.service
      .importarZip(base64)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importing.set(false)),
      )
      .subscribe({
        next: (res) => this.onImportSuccess(res),
        error: () => this.errorMsg.set(this.t().entities.eventosDian.importar.errors.parse),
      });
  }

  private onImportSuccess(res: ImportarZipResponse): void {
    this.response.set(res);
    if (res.contacto.existe) {
      this.contactoId.set(res.contacto.contacto_id);
      this.step.set(2);
    } else {
      this.prefillProveedor(res);
      this.step.set(1);
    }
  }

  // ── Paso 2: proveedor ─────────────────────────────────────────────────────

  private prefillProveedor(res: ImportarZipResponse): void {
    const c = res.contacto;
    this.proveedorForm.reset({
      identificacion: null,
      numero_identificacion: c.numero_identificacion ?? '',
      nombre_corto: c.nombre_corto ?? '',
      ciudad: c.ciudad_id ? { id: c.ciudad_id, nombre: c.ciudad ?? '' } : null,
      direccion: c.direccion ?? '',
      correo: c.correo ?? '',
      plazo_pago: null,
    });
  }

  protected guardarProveedor(): void {
    if (this.savingContacto()) return;
    if (this.proveedorForm.invalid) {
      this.proveedorForm.markAllAsTouched();
      return;
    }
    const raw = this.proveedorForm.getRawValue();
    const payload: ContactoPayload = {
      tipo_persona: this.contacto()?.tipo_persona ?? 1,
      responsabilidad: null,
      identificacion: raw.identificacion?.id ?? null,
      numero_identificacion: raw.numero_identificacion,
      digito_verificacion: null,
      nombre_corto: raw.nombre_corto,
      nombre1: null,
      nombre2: null,
      apellido1: null,
      apellido2: null,
      telefono: null,
      celular: null,
      ciudad: raw.ciudad?.id ?? null,
      direccion: raw.direccion || null,
      barrio: null,
      correo: raw.correo || null,
      cliente: false,
      proveedor: true,
      empleado: false,
      plazo_pago: null,
      precio: null,
      asesor: null,
      correo_facturacion_electronica: null,
      banco: null,
      numero_cuenta: null,
      cuenta_banco_clase: null,
      plazo_pago_proveedor: raw.plazo_pago?.id ?? null,
    };

    const toast = this.t().entities.eventosDian.importar.toasts.proveedor;
    this.savingContacto.set(true);
    this.contactoService
      .create(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingContacto.set(false)),
      )
      .subscribe({
        next: (contacto) => {
          this.contactoId.set(contacto.id);
          this.step.set(2);
        },
        error: () => this.toast.error(toast.error.title, toast.error.desc),
      });
  }

  // ── Paso 3: confirmar y crear factura ─────────────────────────────────────

  protected crearFactura(): void {
    const doc = this.documento();
    const contactoId = this.contactoId();
    if (!doc || contactoId == null || this.savingFactura()) return;
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }

    const raw = this.confirmForm.getRawValue();
    const payload = construirPayloadFactura(doc, {
      contactoId,
      formaPagoId: raw.forma_pago?.id ?? 1,
      almacenId: raw.almacen?.id ?? 1,
      grupoContabilidadId: raw.grupo_contabilidad?.id ?? 1,
      plazoPagoId: this.contacto()?.plazo_pago_proveedor_id
        ? Number(this.contacto()?.plazo_pago_proveedor_id)
        : null,
    });

    const toast = this.t().entities.eventosDian.importar.toasts.factura;
    this.savingFactura.set(true);
    this.service
      .guardarFactura(payload)
      .pipe(
        switchMap((res: GuardarFacturaResponse) => {
          const id = res.documento?.id;
          if (!id) return throwError(() => new Error('missing-document-id'));
          return this.service.aprobar(id);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingFactura.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toast.success.title, toast.success.desc);
          this.saved.emit();
          this.close();
        },
        error: () => this.toast.error(toast.error.title, toast.error.desc),
      });
  }

  // ── Cierre / reset ──────────────────────────────────────────────────────────

  protected close(): void {
    this.visible.set(false);
    this.reset();
  }

  protected onVisibleChange(open: boolean): void {
    this.visible.set(open);
    if (!open) this.reset();
  }

  private reset(): void {
    this.step.set(0);
    this.file.set(null);
    this.response.set(null);
    this.contactoId.set(null);
    this.errorMsg.set(null);
    this.proveedorForm.reset();
    this.confirmForm.reset();
  }
}
