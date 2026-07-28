import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { I18nService } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import type { InformeCuentasForm } from '../../informe-cuentas.types';

/**
 * Panel de parámetros común a los informes contables de saldos por cuenta:
 * periodo, rango de cuentas y las dos banderas.
 *
 * Recibe el `FormGroup` ya construido (`buildInformeCuentasForm`) en vez de
 * crearlo: la página es la dueña del estado y quien decide qué validador de
 * rango aplica. Los informes que piden parámetros extra —contacto,
 * comprobante— los proyectan por `ng-content`, que se pinta como una celda más
 * de la grilla.
 *
 * El `idPrefix` evita colisiones de `id` si algún día conviven dos paneles.
 */
@Component({
  selector: 'app-informe-cuentas-params',
  standalone: true,
  imports: [ReactiveFormsModule, CheckboxModule, DatePickerModule, ErpCuentaSelectComponent],
  templateUrl: './informe-cuentas-params.component.html',
  styleUrl: './informe-cuentas-params.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeCuentasParamsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly form = input.required<InformeCuentasForm>();

  /** Prefijo de los `id` de los campos (para el `for` de las etiquetas). */
  readonly idPrefix = input<string>('informe');
}
