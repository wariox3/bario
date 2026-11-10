import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Movimiento } from '@erp/core/contabilidad';

/** Informe plano de movimientos: sirve `lista/` y `excel/`. */
export const MOVIMIENTO_INFORME_ENDPOINT = '/contabilidad/movimiento-informe/';

/** Discriminador del informe: el endpoint responde 400 sin él. */
export const MOVIMIENTO_INFORME = 'movimiento';

/**
 * Servicio HTTP de la consulta de **movimientos contables**.
 *
 * Solo lectura: el movimiento lo genera la contabilización de un documento, no
 * se crea, edita ni importa desde aquí.
 *
 * La lista y el Excel salen del informe plano de movimientos
 * (`/contabilidad/movimiento-informe/`, un renglón por movimiento, con
 * `{ filtros, ordenamientos }` y la paginación en query).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class MovimientoService extends BaseHttpService {
  private readonly resourcePath = MOVIMIENTO_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${MOVIMIENTO_INFORME_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<Movimiento>> {
    return this.post<PaginatedResponse<Movimiento>>(
      `${this.resourcePath}lista/`,
      { ...buildListBody(query), informe: MOVIMIENTO_INFORME },
      buildListParams(query),
    );
  }
}
