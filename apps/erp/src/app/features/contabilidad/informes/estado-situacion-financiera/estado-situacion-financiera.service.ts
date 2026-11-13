import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type {
  InformeEstadoRow,
  InformeId,
  MovimientoInformeParams,
} from '../../shared/movimiento-informe.types';
import type {
  PresentacionSituacion,
  SituacionFormal,
  SituacionFormalOpciones,
} from './estado-situacion-financiera.types';

const MOVIMIENTO_INFORME_SITUACION_ENDPOINT = '/contabilidad/movimiento-informe-situacion/';

/**
 * Servicio HTTP del informe **Estado de situación financiera**.
 *
 * Endpoint propio, sin paginación ni `totales/`, gemelo del de resultados: la
 * presentación va en `informe` y cambia la forma de la respuesta de `lista/`,
 * así que se expone un método por presentación.
 *
 * A diferencia de resultados, **sí sirve `pdf/`**, pero solo del formal: es el
 * estado listo para firmar. La base responde 400.
 *
 * De la base de la familia solo se reutilizan `exportUrl` y `pdfUrl`,
 * apuntados a este endpoint.
 */
@Injectable({ providedIn: 'root' })
export class EstadoSituacionFinancieraService extends MovimientoInformeService<InformeEstadoRow> {
  protected readonly informe: InformeId = 'estado_situacion_financiera';

  override readonly exportUrl = `${MOVIMIENTO_INFORME_SITUACION_ENDPOINT}excel/`;
  override readonly pdfUrl = `${MOVIMIENTO_INFORME_SITUACION_ENDPOINT}pdf/`;

  /**
   * Body de las tres acciones. El formal es un **corte**: no lleva
   * `fecha_desde` y sí `comparar` y `nivel`. La base es un rango y no lleva
   * ninguno de los dos (por eso `opciones` es opcional). Ninguno declara `solo_con_saldo`, así que no viaja.
   */
  buildBodySituacion(
    presentacion: PresentacionSituacion,
    params: MovimientoInformeParams,
    opciones?: SituacionFormalOpciones,
  ): Record<string, unknown> {
    const { fecha_desde, fecha_hasta, filtros } = params;
    if (presentacion === 'formal') {
      return { informe: presentacion, fecha_hasta, ...opciones, filtros };
    }
    return { informe: presentacion, fecha_desde, fecha_hasta, filtros };
  }

  listaBase(params: MovimientoInformeParams): Observable<readonly InformeEstadoRow[]> {
    return this.post<readonly InformeEstadoRow[]>(
      `${MOVIMIENTO_INFORME_SITUACION_ENDPOINT}lista/`,
      this.buildBodySituacion('base', params),
    );
  }

  listaFormal(
    params: MovimientoInformeParams,
    opciones: SituacionFormalOpciones,
  ): Observable<SituacionFormal> {
    return this.post<SituacionFormal>(
      `${MOVIMIENTO_INFORME_SITUACION_ENDPOINT}lista/`,
      this.buildBodySituacion('formal', params, opciones),
    );
  }
}
