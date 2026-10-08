import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeId, InformeSaldosRow } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Balance de prueba**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * El balance no baja al detalle: sus filas son las del plan de cuentas (los
 * subtotales de clase, grupo y cuenta más cada auxiliar), sin terceros ni
 * movimientos.
 */
@Injectable({ providedIn: 'root' })
export class BalancePruebaService extends MovimientoInformeService<InformeSaldosRow> {
  protected readonly informe: InformeId = 'balance_prueba';
}
