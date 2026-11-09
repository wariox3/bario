import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type {
  InformeEstadoRow,
  InformeId,
  MovimientoInformeParams,
} from '../../shared/movimiento-informe.types';

/** Informes presentados: solo Excel, con su propio discriminador. */
const MOVIMIENTO_INFORME_ESPECIAL_EXCEL_ENDPOINT =
  '/contabilidad/movimiento-informe-especial/excel/';

/**
 * Servicio HTTP del informe **Estado de resultados**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe-base/`,
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

  readonly exportEspecialUrl = MOVIMIENTO_INFORME_ESPECIAL_EXCEL_ENDPOINT;

  /**
   * Body del estado formal (secciones, utilidades y comparado con el año
   * anterior). El endpoint no declara `solo_con_saldo`, por eso no viaja.
   */
  buildBodyEspecial(params: MovimientoInformeParams): Record<string, unknown> {
    const { fecha_desde, fecha_hasta, filtros } = params;
    return { informe: 'estado_resultados_formal', fecha_desde, fecha_hasta, filtros };
  }
}
