import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import {
  CUENTA_BANCO_ENDPOINT,
  DOCUMENT_TYPE_ID,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  asesorLabel,
  extractErrorMessage,
  type ErpSelectOption,
} from '@reddoc/core';
import {
  ErpApiSelectComponent,
  ErpAsesorSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
} from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../configuracion-caja.store';
import { POS_DOCUMENTO_TIPOS, type PosDocumentoTipoId } from '../../configuracion-caja.model';

/**
 * Configuración de la caja: con qué tipo de documento factura, de qué almacén
 * sale la mercancía, a qué cuenta entra el efectivo, y sede y asesor por defecto.
 *
 * El tipo de documento es de la empresa y se guarda en el backend: cambiarlo
 * aquí lo cambia para todas sus cajas. El resto se guarda en este dispositivo.
 */
@Component({
  selector: 'app-configuracion-caja',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    RadioButtonModule,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './configuracion-caja.component.html',
})
export class ConfiguracionCajaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ConfiguracionCajaStore);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly estadoTipo = this.store.estadoTipo;
  protected readonly guardando = signal(false);

  protected readonly tipos = POS_DOCUMENTO_TIPOS;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;
  protected readonly sedeEndpoint = SELECT_ENDPOINTS.sede;
  protected readonly cuentaEndpoint = CUENTA_BANCO_ENDPOINT;

  protected readonly form = this.fb.group({
    documentoTipoId: this.fb.control<PosDocumentoTipoId | null>(null, Validators.required),
    almacen: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuentaEfectivo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    sede: this.fb.control<ErpSelectOption | null>(null),
    asesor: this.fb.control<ErpSelectOption | null>(null),
  });

  /**
   * Una caja nueva toma el primer almacén, como el ERP en sus documentos: lo
   * habitual es tener uno solo. Si ya hay uno guardado, manda ese.
   */
  protected readonly almacenSugerido = this.store.configuracion().almacen ? null : 0;

  constructor() {
    this.form.setValue(this.store.configuracion());

    // El tipo llega del backend después de pintar la página. Mientras carga (o si
    // falló) el control va deshabilitado: no se valida ni se guarda.
    const tipo = this.form.controls.documentoTipoId;
    effect(() => {
      const estado = this.estadoTipo();
      const valor = this.store.configuracion().documentoTipoId;
      untracked(() => {
        if (estado !== 'listo') {
          tipo.disable();
          return;
        }
        if (tipo.pristine) tipo.setValue(valor);
        tipo.enable();
      });
    });
  }

  protected recargarTipo(): void {
    this.store.recargarTipo();
  }

  protected tipoLabel(tipo: PosDocumentoTipoId): string {
    const tipos = this.t().configuracion.tipos;
    return tipo === DOCUMENT_TYPE_ID.FACTURA_POS ? tipos.pos : tipos.posElectronica;
  }

  protected onSubmit(): void {
    if (this.guardando() || this.form.invalid) return;
    const { documentoTipoId, asesor, ...local } = this.form.getRawValue();
    this.store.guardarLocal({
      ...local,
      // El selector de asesor trae `nombre_corto`, no `nombre`: se normaliza para
      // que la opción guardada tenga la forma `{ id, nombre }` de las demás.
      asesor: asesor ? { id: asesor.id, nombre: asesorLabel(asesor) } : null,
    });

    const tipoControl = this.form.controls.documentoTipoId;
    const cambioTipo =
      tipoControl.enabled &&
      documentoTipoId !== null &&
      documentoTipoId !== this.store.configuracion().documentoTipoId;
    if (!cambioTipo) {
      this.alGuardar();
      return;
    }

    this.guardando.set(true);
    this.store
      .guardarTipo(documentoTipoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.alGuardar();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          // Lo de la caja ya quedó; el tipo sigue sin guardar y el form, sucio.
          const tx = this.t().configuracion.toasts.tipoError;
          this.toast.error(tx.title, extractErrorMessage(err, tx.desc));
        },
      });
  }

  private alGuardar(): void {
    this.form.markAsPristine();
    const ok = this.t().configuracion.toasts.guardada;
    this.toast.success(ok.title, ok.desc);
  }
}
