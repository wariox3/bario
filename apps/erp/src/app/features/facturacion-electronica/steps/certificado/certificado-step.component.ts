import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService, formatFechaCorta } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { FacturaElectronicaService } from '../../factura-electronica.service';
import type { CertificadoRedEDoc } from '../../factura-electronica.model';

/** Estado del certificado del contenedor, del más urgente al más tranquilo. */
export type CertificadoEstado = 'sin-certificado' | 'vencido' | 'por-vencer' | 'vigente';

/** Días antes del vencimiento en los que ya se avisa. */
const DIAS_AVISO = 30;

/** Extensiones del certificado digital que emite la DIAN. */
const ACCEPT = '.p12,.pfx';
const MAX_MB = 5;

/**
 * Convierte `AAAA-MM-DD` en una fecha **local**.
 *
 * `new Date('2027-03-14')` la interpreta como medianoche UTC: al oeste de
 * Greenwich el certificado aparecería venciendo el día anterior.
 */
function parseFechaLocal(iso: string | null): Date | null {
  if (!iso) return null;
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

/** Días completos entre hoy y la fecha, negativo si ya pasó. */
function diasHasta(fecha: Date): number {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fecha.getTime() - desde.getTime()) / 86_400_000);
}

/**
 * Paso «Certificado digital» del asistente de facturación electrónica.
 *
 * Auto-contenido: consulta el certificado en RedEDoc
 * (`certificado-consultar/`), sube el archivo y lo relee. Solo avisa hacia
 * afuera cuando el usuario quiere avanzar.
 *
 * Regla de negocio: **con un certificado cargado no se sube otro**, ni siquiera
 * vencido. La pantalla muestra el que hay; el color solo dice su urgencia. Para
 * cambiarlo hay que eliminarlo primero, y recién ahí vuelve la zona de carga.
 */
@Component({
  selector: 'app-certificado-step',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PasswordModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './certificado-step.component.html',
})
export class CertificadoStepComponent {
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly formErrors = inject(FormErrorService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly accept = ACCEPT;

  /** El usuario terminó con este paso y quiere seguir. */
  readonly avanzar = output<void>();

  protected readonly loading = signal(true);
  protected readonly subiendo = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly dragOver = signal(false);
  protected readonly fileError = signal<string | null>(null);
  /** Certificado cargado en RedEDoc; `null` si todavía no hay ninguno. */
  protected readonly certificado = signal<CertificadoRedEDoc | null>(null);
  /**
   * La consulta falló. No se ofrece la carga a ciegas: si ya había un
   * certificado, la regla es no subir otro, así que se pide reintentar.
   */
  protected readonly consultaError = signal(false);

  protected readonly form = this.fb.group({
    clave: this.fb.nonNullable.control('', Validators.required),
  });

  protected readonly venceDate = computed(() =>
    parseFechaLocal(this.certificado()?.vigente_hasta ?? null),
  );

  protected readonly dias = computed(() => {
    const fecha = this.venceDate();
    return fecha ? diasHasta(fecha) : null;
  });

  protected readonly estado = computed<CertificadoEstado>(() => {
    const dias = this.dias();
    if (dias === null) return 'sin-certificado';
    if (dias < 0) return 'vencido';
    if (dias <= DIAS_AVISO) return 'por-vencer';
    return 'vigente';
  });

  /** La zona de carga solo aparece cuando RedEDoc confirma que no hay certificado. */
  protected readonly puedeCargar = computed(
    () => !this.consultaError() && this.certificado() === null,
  );

  /**
   * Línea de apoyo de la tarjeta de archivo: la vigencia completa y, si el
   * certificado tiene alias (que entonces va de título), el archivo real.
   */
  protected readonly archivoMetaTexto = computed(() => {
    const cert = this.certificado();
    if (!cert) return '';
    const vigencia = this.t()
      .facturacionElectronica.certificado.detalle.vigencia.replace(
        '{desde}',
        formatFechaCorta(parseFechaLocal(cert.vigente_desde), ''),
      )
      .replace('{hasta}', formatFechaCorta(parseFechaLocal(cert.vigente_hasta), ''));
    return cert.alias ? `${cert.nombre_archivo} · ${vigencia}` : vigencia;
  });

  /** Fecha corta (`28/03/2027`): es una ficha, no la cabecera de un documento. */
  protected readonly venceTexto = computed(() => formatFechaCorta(this.venceDate(), ''));

  /** "faltan 205 días" / "venció hace 3 días", ya resuelto acá y no en el template. */
  protected readonly diasTexto = computed(() => {
    const dias = this.dias();
    if (dias === null) return '';
    const dict = this.t().facturacionElectronica.certificado.estado;
    if (dias < 0) {
      const abs = Math.abs(dias);
      return abs === 1
        ? dict.vencidoHace.one
        : dict.vencidoHace.other.replace('{dias}', String(abs));
    }
    if (dias === 0) return dict.venceHoy;
    return dias === 1 ? dict.faltan.one : dict.faltan.other.replace('{dias}', String(dias));
  });

  constructor() {
    this.cargarEstado();
  }

  protected cargarEstado(): void {
    this.loading.set(true);
    this.consultaError.set(false);
    this.facturaElectronica
      .consultarCertificado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (certificado) => {
          this.certificado.set(certificado);
          this.loading.set(false);
        },
        error: () => {
          this.consultaError.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Eliminar deja a la empresa sin poder emitir: se confirma antes. */
  protected confirmarEliminar(): void {
    if (this.eliminando()) return;
    const confirm = this.t().facturacionElectronica.certificado.confirmEliminar;
    this.confirmation.confirm({
      header: confirm.header,
      message: confirm.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: confirm.accept,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(),
    });
  }

  private eliminar(): void {
    this.eliminando.set(true);
    const toast = this.t().facturacionElectronica.certificado.toasts.eliminado;
    this.facturaElectronica
      .eliminarCertificado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando.set(false);
          this.toast.success(toast.title, toast.desc);
          // Se relee en vez de vaciarlo a mano: que la zona de carga aparezca
          // porque RedEDoc confirma que ya no hay certificado.
          this.cargarEstado();
        },
        // El error lo muestra el interceptor; el certificado sigue a la vista.
        error: () => this.eliminando.set(false),
      });
  }

  protected openFilePicker(input: HTMLInputElement): void {
    if (this.subiendo()) return;
    input.click();
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) this.aceptarArchivo(file);
    // Permite volver a elegir el mismo archivo tras quitarlo.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.subiendo()) return;
    this.dragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (this.subiendo()) return;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) this.aceptarArchivo(file);
  }

  protected quitarArchivo(): void {
    if (this.subiendo()) return;
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  private aceptarArchivo(file: File): void {
    const dict = this.t().facturacionElectronica.certificado.errors;
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!ACCEPT.split(',').includes(extension)) {
      this.selectedFile.set(null);
      this.fileError.set(dict.tipo.replace('{tipos}', ACCEPT));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      this.selectedFile.set(null);
      this.fileError.set(dict.tamano.replace('{max}', String(MAX_MB)));
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  protected onSubmit(): void {
    // El botón no se deshabilita por lo que falta (convención de formularios):
    // al intentar, se marca la clave y, si no hay archivo, se dice en la zona
    // de carga — sin pisar un error de tipo o tamaño que ya esté a la vista.
    const file = this.selectedFile();
    if (!file && !this.fileError()) {
      this.fileError.set(this.t().facturacionElectronica.certificado.errors.requerido);
    }
    if (!file || this.form.invalid || this.subiendo()) {
      this.form.markAllAsTouched();
      return;
    }
    this.subiendo.set(true);

    const dict = this.t().facturacionElectronica.certificado;
    this.facturaElectronica
      .cargarCertificado(file, this.form.getRawValue().clave)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.subiendo.set(false);
          this.selectedFile.set(null);
          this.form.reset();
          this.toast.success(dict.toasts.success.title, dict.toasts.success.desc);
          // El vencimiento lo sabe el backend, no nosotros: se relee para que
          // la tarjeta muestre la fecha real del archivo recién subido.
          this.cargarEstado();
        },
        error: (err: unknown) => {
          this.subiendo.set(false);
          // Una clave incorrecta es el error más probable, y el backend la
          // señala por campo: que aterrice bajo la clave, no en un toast.
          this.formErrors.handle(this.form, err, dict.toasts.error.title);
        },
      });
  }
}
