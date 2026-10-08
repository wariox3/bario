import type { Observable } from 'rxjs';
import { BaseHttpService, LIST_PAGINATION_PARAMS, type PaginatedResponse } from '@reddoc/core';
import type {
  InformeId,
  InformeTotales,
  MovimientoInformeParams,
} from './movimiento-informe.types';

/**
 * Punto único de informes agregados sobre el movimiento contable. Sirve tres
 * acciones con el **mismo body**: `lista/` (paginada), `excel/` y `totales/`.
 * La cuarta, `pdf/`, comparte el body pero **solo la sirve el certificado de
 * retención**: ver `pdfUrl`.
 */
export const MOVIMIENTO_INFORME_ENDPOINT = '/contabilidad/movimiento-informe/';

/**
 * Base de los servicios de los informes contables.
 *
 * Cada informe solo declara su `informe` (el discriminador del enum); toda la
 * mecánica —las tres acciones, la paginación por query params, el body común—
 * vive acá. Un informe de esta familia son unas diez líneas.
 *
 * El body va plano (`{ informe, fecha_desde, fecha_hasta, solo_con_saldo,
 * filtros }`) y la respuesta es una página, no el informe entero.
 *
 * No se manda `ordenamientos`: el endpoint lo rechaza a propósito (el orden lo
 * fija el agrupado, por código de cuenta).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
export abstract class MovimientoInformeService<TRow> extends BaseHttpService {
  /** Discriminador que el backend lee del body para elegir el informe. */
  protected abstract readonly informe: InformeId;

  /** URL de la descarga de Excel (la usa `FileDownloadService`). */
  readonly exportUrl = `${MOVIMIENTO_INFORME_ENDPOINT}excel/`;

  /**
   * URL de la impresión en PDF, simétrica a `excel/`: mismo verbo y mismo body.
   *
   * La acción existe pero **no es de la familia entera**: solo acepta
   * `certificado_retencion` —del que devuelve una hoja por tercero— y responde
   * 400 a los otros ocho informes. Por eso el botón se enciende informe por
   * informe con `soportaPdf` y no de una vez en la botonera.
   */
  readonly pdfUrl = `${MOVIMIENTO_INFORME_ENDPOINT}pdf/`;

  /**
   * Body común a las tres acciones. Público porque la descarga la dispara la
   * página con `FileDownloadService`, que necesita el mismo body que la consulta.
   */
  buildBody(params: MovimientoInformeParams): Record<string, unknown> {
    return { informe: this.informe, ...params };
  }

  /** Una página del informe. */
  list(
    params: MovimientoInformeParams,
    page: number,
    pageSize: number,
  ): Observable<PaginatedResponse<TRow>> {
    return this.post<PaginatedResponse<TRow>>(
      `${MOVIMIENTO_INFORME_ENDPOINT}lista/`,
      this.buildBody(params),
      {
        [LIST_PAGINATION_PARAMS.page]: page + 1,
        [LIST_PAGINATION_PARAMS.size]: pageSize,
      },
    );
  }

  /**
   * Totales de cuadre del informe **completo**. Van aparte porque `lista/`
   * pagina: sumar las filas recibidas daría el total de la página, no el del
   * informe. El backend suma solo las filas de tipo `AUXILIAR`.
   */
  totales(params: MovimientoInformeParams): Observable<InformeTotales> {
    return this.post<InformeTotales>(
      `${MOVIMIENTO_INFORME_ENDPOINT}totales/`,
      this.buildBody(params),
    );
  }
}
