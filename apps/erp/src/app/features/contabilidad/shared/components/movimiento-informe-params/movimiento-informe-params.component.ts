import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { MascaraFechaDirective } from '@reddoc/ui';
import { I18nService } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import type { MovimientoInformeForm } from '../../movimiento-informe.types';

/**
 * Panel de parámetros de los informes contables: periodo, rango de cuentas y
 * `solo_con_saldo`.
 *
 * Componente tonto: recibe el `FormGroup` ya construido
 * (`buildMovimientoInformeForm`); la página es la dueña del estado. Los
 * informes que piden parámetros extra los proyectan por `ng-content`, que se
 * pinta como una celda más de la grilla.
 */
@Component({
  selector: 'app-movimiento-informe-params',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CheckboxModule,
    DatePickerModule,
    MascaraFechaDirective,
    ErpCuentaSelectComponent,
  ],
  templateUrl: './movimiento-informe-params.component.html',
  styleUrl: './movimiento-informe-params.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovimientoInformeParamsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly form = input.required<MovimientoInformeForm>();

  /** Prefijo de los `id` de los campos (para el `for` de las etiquetas). */
  readonly idPrefix = input<string>('informe');

  /**
   * Muestra el rango de cuentas. Se apaga en los informes que no recorren el
   * plan (los cuatro planos), donde acotar por código no significa nada.
   */
  readonly showCuentas = input<boolean>(true);

  /**
   * Muestra `solo_con_saldo`. El backend lo ignora en los informes planos, así
   * que ahí el checkbox sería una promesa vacía.
   */
  readonly showSoloConSaldo = input<boolean>(true);

  /**
   * Pinta la banda de parámetros propios (tercero, número, comprobante) con el
   * contenido proyectado.
   *
   * Es un input y no una detección del `ng-content` porque una banda vacía
   * seguiría costando su filete y su encabezado: un elemento que no pinta nada
   * igual ocupa su ranura.
   */
  readonly showDetalle = input<boolean>(false);
}
