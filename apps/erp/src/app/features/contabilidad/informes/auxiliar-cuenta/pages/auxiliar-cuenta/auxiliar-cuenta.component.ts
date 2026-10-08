import { Component, inject } from '@angular/core';
import { ListShellComponent } from '@reddoc/feature-base';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type { InformeAuxiliarCuentaRow } from '../../../../shared/movimiento-informe.types';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { AuxiliarCuentaService } from '../../auxiliar-cuenta.service';

/**
 * Informe **Auxiliar de cuenta** del módulo Contabilidad.
 *
 * El plan de cuentas con **una fila por asiento** del rango colgando de cada
 * auxiliar, sin abrir por tercero. Para eso están el balance por contacto (que
 * abre por tercero pero no baja al asiento) y el auxiliar general (que hace las
 * dos cosas).
 *
 * **Migrar arregla lo que esta pantalla prometía y no hacía.** La versión
 * anterior pintaba exactamente las mismas columnas de saldos que el balance de
 * prueba —el endpoint viejo no devolvía movimientos— y quedó portada así a
 * propósito, anotada como hueco en `PENDIENTES.md` §5. El contrato nuevo sí
 * sirve el detalle, así que el auxiliar por fin es un auxiliar.
 *
 * ⚠️ **Sus filas de detalle solo se identifican por `movimiento_id`**: este
 * informe no trae comprobante, número ni fecha (sí el auxiliar general). Por eso
 * la tabla enciende la columna del id, que al menos permite buscar el asiento en
 * la consulta de movimientos, que lista por `id`. Si backend puede sumar
 * comprobante y número acá, esa columna técnica sobra — ver `PENDIENTES.md` §0.
 */
@Component({
  selector: 'app-auxiliar-cuenta',
  standalone: true,
  imports: [
    ListShellComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './auxiliar-cuenta.component.html',
  styleUrl: './auxiliar-cuenta.component.scss',
})
export class AuxiliarCuentaComponent extends MovimientoInformePageBase<InformeAuxiliarCuentaRow> {
  protected readonly service = inject(AuxiliarCuentaService);
  protected readonly archivo = 'auxiliar-cuenta';

  protected get nombre(): string {
    return this.t().entities.auxiliarCuenta.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.auxiliarCuenta.empty;
  }
}
