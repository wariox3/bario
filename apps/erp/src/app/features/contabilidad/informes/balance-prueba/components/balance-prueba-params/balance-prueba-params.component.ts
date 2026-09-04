import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { I18nService } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import type { BalancePruebaForm } from '../../balance-prueba.model';

/**
 * Panel de parámetros del **balance de prueba**: periodo, rango de cuentas y las
 * banderas `incluir_cierre` y `solo_con_saldo`.
 *
 * No reusa `<app-informe-cuentas-params>` porque el contrato nuevo renombró la
 * segunda bandera: `cuenta_con_movimiento` pasó a ser `solo_con_saldo`, y ahora
 * viene encendida por defecto. Aquel panel la ata por `formControlName` al
 * nombre viejo, así que compartirlo obligaría a arrastrar un control muerto en
 * el formulario solo para satisfacer su template.
 *
 * Componente tonto: recibe el `FormGroup` ya construido
 * (`buildBalancePruebaForm`); la página es la dueña del estado.
 */
@Component({
  selector: 'app-balance-prueba-params',
  standalone: true,
  imports: [ReactiveFormsModule, CheckboxModule, DatePickerModule, ErpCuentaSelectComponent],
  templateUrl: './balance-prueba-params.component.html',
  styleUrl: './balance-prueba-params.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalancePruebaParamsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly form = input.required<BalancePruebaForm>();
}
