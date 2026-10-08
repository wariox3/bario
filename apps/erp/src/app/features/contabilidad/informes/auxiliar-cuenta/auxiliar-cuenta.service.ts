import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeAuxiliarCuentaRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Auxiliar de cuenta**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Bajo cada auxiliar del plan cuelga una fila por asiento del rango, sin abrir
 * por tercero. Sus filas son las más angostas de los tres auxiliares: sobre las
 * del balance solo suman `movimiento_id`.
 */
@Injectable({ providedIn: 'root' })
export class AuxiliarCuentaService extends MovimientoInformeService<InformeAuxiliarCuentaRow> {
  protected readonly informe: InformeId = 'auxiliar_cuenta';
}
