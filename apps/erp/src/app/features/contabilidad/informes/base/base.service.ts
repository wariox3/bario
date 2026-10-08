import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeBasesRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Base**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * El primero de los **planos**: no recorre el plan de cuentas sino lo que pasó
 * en el rango, así que no trae jerarquía, subtotales ni saldo anterior/final, y
 * `totales/` suma todas sus filas en vez de solo las de tipo `AUXILIAR`.
 */
@Injectable({ providedIn: 'root' })
export class InformeBaseService extends MovimientoInformeService<InformeBasesRow> {
  protected readonly informe: InformeId = 'bases';
}
