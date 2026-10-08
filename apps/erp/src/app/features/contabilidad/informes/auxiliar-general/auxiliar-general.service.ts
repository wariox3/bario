import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeId, InformeMovimientoRow } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Auxiliar general**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Es el más detallado de los cinco informes jerárquicos: bajo cada auxiliar del
 * plan vienen primero sus **terceros** y después todos sus **movimientos**, con
 * comprobante, número y fecha. Por eso sus filas son `InformeMovimientoRow`, el
 * tipo más ancho de la familia.
 */
@Injectable({ providedIn: 'root' })
export class AuxiliarGeneralService extends MovimientoInformeService<InformeMovimientoRow> {
  protected readonly informe: InformeId = 'auxiliar_general';
}
