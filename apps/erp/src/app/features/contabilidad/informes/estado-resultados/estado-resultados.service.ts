import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeEstadoRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Estado de resultados**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Plano: las cuentas de resultado que movieron, cada una con su saldo. Comparte
 * forma exacta con el estado de situación financiera, que solo cambia qué clases
 * cubre.
 */
@Injectable({ providedIn: 'root' })
export class EstadoResultadosService extends MovimientoInformeService<InformeEstadoRow> {
  protected readonly informe: InformeId = 'estado_resultados';
}
