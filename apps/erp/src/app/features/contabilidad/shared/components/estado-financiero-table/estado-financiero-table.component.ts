import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { EstadoFinancieroRow } from '../../informe-cuentas.types';

/**
 * Tabla de los **estados financieros** (resultados y situación financiera):
 * cada cuenta con su saldo, ubicada en el plan por clase y grupo.
 *
 * Componente tonto, compartido por los dos informes —que en el ERP anterior son
 * la misma pantalla con distinto endpoint—.
 *
 * **Sin fila de totales**, como el original: el saldo mezcla cuentas de
 * naturaleza contraria (ingresos y gastos, activo y pasivo), así que una suma
 * cruda no es la utilidad ni el patrimonio. Calcularla bien es trabajo del
 * backend, no de la tabla.
 */
@Component({
  selector: 'app-estado-financiero-table',
  standalone: true,
  templateUrl: './estado-financiero-table.component.html',
  styleUrl: './estado-financiero-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadoFinancieroTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly EstadoFinancieroRow[]>();

  /**
   * `true` una vez que el usuario generó el informe. Distingue "todavía no
   * generaste" de "no hay resultados", que se leen muy distinto.
   */
  readonly generated = input<boolean>(false);

  protected formatMonto(value: number | string | null): string {
    return formatCop(value ?? 0);
  }
}
