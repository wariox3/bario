import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  BaseHttpService,
  buildListParams,
  buildOrdenamientos,
  type ListQuery,
  type PaginatedResponse,
  type ParamValue,
} from '@reddoc/core';
import {
  toPaginatedResponse,
  type CuentaCobrarCorte,
  type CuentaCobrarCorteRawResponse,
} from './cuenta-cobrar-corte.model';

/** Endpoint del informe de corte (`GET` para consultar, `?excel=True` para Excel). */
export const CUENTA_COBRAR_CORTE_ENDPOINT = '/cartera/informe/pendiente-corte/';

/** Serializador que el backend usa para acotar el informe a las columnas de corte. */
export const CUENTA_COBRAR_CORTE_SERIALIZADOR = 'Informe';

/**
 * Servicio HTTP del informe **Cuentas por cobrar corte**.
 *
 * A diferencia del resto de informes del ERP (POST `documento-informe/lista/`
 * con `{ filtros, ordenamientos }`), el corte es un **GET** parametrizado por la
 * **fecha de corte** — el input protagonista del reporte. Adapta la respuesta
 * cruda `{ registros, cantidad_registros }` al envelope estándar
 * `{ results, count }`. La paginación va como query params.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuesto pendiente de confirmar con backend**: el path, el param `fecha`
 * (`yyyy-MM-dd`), `serializador: 'Informe'`, que respete `page`/`limit` y que la
 * descarga se pida con `excel=True`.
 */
@Injectable({ providedIn: 'root' })
export class CuentaCobrarCorteService extends BaseHttpService {
  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = CUENTA_COBRAR_CORTE_ENDPOINT;

  /**
   * Consulta la cartera por cobrar a la `fecha` de corte, paginada.
   * `query.filters` se ignora (el informe solo se parametriza por fecha).
   */
  list(fecha: string, query: ListQuery): Observable<PaginatedResponse<CuentaCobrarCorte>> {
    const params: Record<string, ParamValue> = {
      fecha,
      serializador: CUENTA_COBRAR_CORTE_SERIALIZADOR,
      ...buildListParams(query),
    };
    const ordering = buildOrdenamientos(query.sort);
    if (ordering.length > 0) params['ordering'] = ordering.join(',');

    return this.get<CuentaCobrarCorteRawResponse>(CUENTA_COBRAR_CORTE_ENDPOINT, params).pipe(
      map(toPaginatedResponse),
    );
  }
}
