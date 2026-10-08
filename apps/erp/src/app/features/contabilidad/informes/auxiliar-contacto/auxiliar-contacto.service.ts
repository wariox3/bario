import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeAuxiliarContactoRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Auxiliar por contacto**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Bajo cada auxiliar del plan va **cada tercero seguido de sus asientos**, a
 * diferencia del auxiliar general, que agrupa primero todos los terceros y
 * después todos los movimientos.
 */
@Injectable({ providedIn: 'root' })
export class AuxiliarContactoService extends MovimientoInformeService<InformeAuxiliarContactoRow> {
  protected readonly informe: InformeId = 'auxiliar_contacto';
}
