import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService, LIST_PAGINATION_PARAMS, type PaginatedResponse } from '@reddoc/core';
import type {
  BalancePruebaParams,
  BalancePruebaRow,
  BalancePruebaTotales,
} from './balance-prueba.model';

/**
 * Punto único de informes agregados sobre el movimiento contable. Sirve tres
 * acciones con el **mismo body**: `lista/` (paginada), `excel/` y `totales/`.
 */
export const BALANCE_PRUEBA_ENDPOINT = '/contabilidad/movimiento-informe/';

/** Discriminador del informe que el backend lee del body. */
export const BALANCE_PRUEBA_INFORME = 'balance_prueba';

/**
 * Servicio HTTP del informe **Balance de prueba**.
 *
 * No extiende `InformeCuentasService` —la base de la familia— porque este
 * informe ya migró al contrato nuevo: manda `{ informe, fecha_desde,
 * fecha_hasta, solo_con_saldo, filtros }` plano en vez de `{ parametros }`, y
 * recibe una página en vez del informe entero. Los otros ocho informes siguen
 * sobre la base vieja hasta que backend los migre.
 *
 * La paginación viaja como query params (`page`/`limit`), igual que el resto de
 * los `lista/` del ERP. No se manda `ordenamientos`: el endpoint lo rechaza a
 * propósito (el orden lo fija el agrupado, por código de cuenta).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class BalancePruebaService extends BaseHttpService {
  /** URL de la descarga de Excel (la usa `FileDownloadService`). */
  readonly exportUrl = `${BALANCE_PRUEBA_ENDPOINT}excel/`;

  /**
   * Body común a las tres acciones. Público porque la descarga la dispara la
   * página con `FileDownloadService`, que necesita el mismo body que la consulta.
   */
  buildBody(params: BalancePruebaParams): Record<string, unknown> {
    return { informe: BALANCE_PRUEBA_INFORME, ...params };
  }

  /** Una página del informe. */
  list(
    params: BalancePruebaParams,
    page: number,
    pageSize: number,
  ): Observable<PaginatedResponse<BalancePruebaRow>> {
    return this.post<PaginatedResponse<BalancePruebaRow>>(
      `${BALANCE_PRUEBA_ENDPOINT}lista/`,
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
   * informe.
   */
  totales(params: BalancePruebaParams): Observable<BalancePruebaTotales> {
    return this.post<BalancePruebaTotales>(
      `${BALANCE_PRUEBA_ENDPOINT}totales/`,
      this.buildBody(params),
    );
  }
}
