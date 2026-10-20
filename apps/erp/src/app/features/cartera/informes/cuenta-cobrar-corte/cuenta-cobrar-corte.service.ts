import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { CuentaCobrarCorte } from './cuenta-cobrar-corte.model';

/**
 * Identificador del informe que el backend lee del body: cuentas por cobrar con
 * saldo pendiente **a la `fecha` de corte**. Gemelo de `pagar_corte`.
 */
export const CUENTA_COBRAR_CORTE_INFORME = 'cobrar_corte';

/** Endpoint del informe (acciones: `lista/`, `excel/`). */
export const CUENTA_COBRAR_CORTE_ENDPOINT = '/general/documento-informe/';

/**
 * Servicio HTTP del informe **Cuentas por cobrar corte**.
 *
 * Mismo endpoint que el resto de informes de documentos (`documento-informe`):
 * POST con `{ informe, fecha, filtros, ordenamientos }`. La **fecha de corte**
 * viaja en el body junto al identificador del informe. La paginación va como
 * query params.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class CuentaCobrarCorteService extends BaseHttpService {
  private readonly resourcePath = CUENTA_COBRAR_CORTE_ENDPOINT;

  /** URL absoluta de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${CUENTA_COBRAR_CORTE_ENDPOINT}excel/`;

  /** Consulta la cartera por cobrar a la `fecha` de corte (`yyyy-MM-dd`), paginada. */
  list(fecha: string, query: ListQuery): Observable<PaginatedResponse<CuentaCobrarCorte>> {
    return this.post<PaginatedResponse<CuentaCobrarCorte>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: CUENTA_COBRAR_CORTE_INFORME, fecha },
      buildListParams(query),
    );
  }
}
