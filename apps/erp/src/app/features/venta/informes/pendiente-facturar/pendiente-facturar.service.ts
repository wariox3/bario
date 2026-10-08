import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { PendienteFacturar } from './pendiente-facturar.model';

/**
 * Identificador del informe que el backend lee del body para acotar
 * `documento-detalle` a las líneas pendientes por facturar.
 */
export const PENDIENTE_FACTURAR_INFORME = 'pendiente_facturar';

/** Endpoint del informe (acciones: `lista/`, `excel/`). */
export const PENDIENTE_FACTURAR_ENDPOINT = '/general/documento-detalle-informe/';

/**
 * Servicio HTTP del informe **Pendiente por facturar**.
 *
 * Consume el endpoint de informes `documento-detalle-informe`, como **informe
 * de solo lectura**: `list` (página paginada) y `exportUrl` (descarga). El
 * backend distingue el informe por el campo `informe` que viaja en el body del
 * POST (junto a `filtros`/`ordenamientos`). La paginación va como query params.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class PendienteFacturarService extends BaseHttpService {
  private readonly resourcePath = PENDIENTE_FACTURAR_ENDPOINT;

  /** URL absoluta de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${PENDIENTE_FACTURAR_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<PendienteFacturar>> {
    return this.post<PaginatedResponse<PendienteFacturar>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: PENDIENTE_FACTURAR_INFORME },
      buildListParams(query),
    );
  }
}
