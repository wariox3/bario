import { Component, inject } from '@angular/core';
import { ListShellComponent } from '@reddoc/feature-base';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type { InformeSaldosRow } from '../../../../shared/movimiento-informe.types';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { BalancePruebaService } from '../../balance-prueba.service';

/**
 * Informe **Balance de prueba** del módulo Contabilidad.
 *
 * Saldos por cuenta de todo el plan en un periodo: saldo anterior, movimiento
 * del rango y saldo final. Es un **reporte que se genera**: la tabla arranca
 * vacía y el usuario elige los parámetros antes de consultar.
 *
 * El endpoint **pagina** y sirve las filas **jerarquizadas**: cada auxiliar viene precedido
 * por los subtotales de su clase, grupo y cuenta, y `tipo` es lo único que los
 * distingue. Por eso los totales del pie no salen de sumar las filas recibidas
 * sino de la acción `totales/`, que suma solo las de tipo `AUXILIAR` sobre el
 * informe completo.
 *
 * Exige que **ambas fechas caigan en el mismo año**: el saldo anterior se
 * calcula contra la apertura del ejercicio, así que un rango a caballo entre dos
 * años daría un balance que no cuadra.
 *
 * Sin PDF: la familia de endpoints nueva solo sirve `lista/`, `excel/` y
 * `totales/`.
 */
@Component({
  selector: 'app-balance-prueba',
  standalone: true,
  imports: [
    ListShellComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './balance-prueba.component.html',
  styleUrl: './balance-prueba.component.scss',
})
export class BalancePruebaComponent extends MovimientoInformePageBase<InformeSaldosRow> {
  protected readonly service = inject(BalancePruebaService);
  protected readonly archivo = 'balance-prueba';

  protected get nombre(): string {
    return this.t().entities.balancePrueba.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.balancePrueba.empty;
  }
}
