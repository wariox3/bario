import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService, type ErpSelectOption } from '@reddoc/core';
import { FieldErrorComponent } from '@reddoc/ui';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';

/**
 * Rango y destino elegidos en el modal. El componente **solo selecciona**: quien
 * lo abre arma el payload y llama al endpoint, igual que
 * `AgregarDocumentoModalComponent`.
 */
export interface CargarCierreSeleccion {
  /** Código de la primera cuenta del rango a cerrar. */
  readonly cuentaDesdeCodigo: string;
  /** Código de la última cuenta del rango a cerrar. */
  readonly cuentaHastaCodigo: string;
  /** Id de la cuenta donde se acumula el resultado del ejercicio. */
  readonly cuentaCierreId: number;
}

/** Lee el código de la opción del selector de cuentas (`{ id, nombre, codigo }`). */
function codigoDe(option: ErpSelectOption | null): string {
  return typeof option?.['codigo'] === 'string' ? option['codigo'] : '';
}

/**
 * Modal de **cargar cierre**: pide el rango de cuentas de resultado a cerrar y
 * la cuenta donde se acumula el resultado del ejercicio.
 *
 * Cierra con `CargarCierreSeleccion` al confirmar y con `null` al cancelar.
 *
 * El rango viaja por **código** y el destino por **id** — asimetría que viene del
 * backend del ERP anterior. El código sale del propio `<app-cuenta-select>`, que
 * lo expone junto al id.
 */
@Component({
  selector: 'app-cargar-cierre-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, FieldErrorComponent, ErpCuentaSelectComponent],
  templateUrl: './cargar-cierre-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargarCierreModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly form = this.fb.group({
    cuenta_desde: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta_hasta: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta_cierre: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { cuenta_desde, cuenta_hasta, cuenta_cierre } = this.form.getRawValue();
    const seleccion: CargarCierreSeleccion = {
      cuentaDesdeCodigo: codigoDe(cuenta_desde),
      cuentaHastaCodigo: codigoDe(cuenta_hasta),
      cuentaCierreId: cuenta_cierre?.id as number,
    };
    this.ref.close(seleccion);
  }

  protected cancel(): void {
    this.ref.close(null);
  }
}
