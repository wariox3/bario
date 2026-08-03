import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { VentaItem } from './venta-item.model';

/**
 * Identificador del informe que el backend lee del body para acotar
 * `documento-detalle` a las líneas de documentos de venta.
 */
export const VENTA_ITEM_INFORME = 'venta_item';

/** Endpoint del informe (acciones: `lista/`, `exportar/`). */
export const VENTA_ITEM_ENDPOINT = '/general/documento-detalle-informe/';

/**
 * Servicio HTTP del informe **Ventas por ítem**.
 *
 * Consume el endpoint de informes `documento-detalle-informe` como **informe
 * de solo lectura**: `list` (página paginada) y `exportUrl` (descarga). El
 * backend distingue el informe por el campo `informe` que viaja en el body del
 * POST (junto a `filtros`/`ordenamientos`). La paginación va como query params.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class VentaItemService extends BaseHttpService {
  private readonly resourcePath = VENTA_ITEM_ENDPOINT;

  /** URL absoluta de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${VENTA_ITEM_ENDPOINT}exportar/`;

  list(query: ListQuery): Observable<PaginatedResponse<VentaItem>> {
    return this.post<PaginatedResponse<VentaItem>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: VENTA_ITEM_INFORME },
      buildListParams(query),
    );
  }
}
