import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { InventarioValorizado } from './inventario-valorizado.model';

/** Endpoint del informe: el master de ítems (acciones `lista/`, `excel/`). */
export const INVENTARIO_VALORIZADO_ENDPOINT = '/general/item/';

/**
 * Serializador que agrega la valorización (`costo_promedio`, `costo_total`) a
 * la fila del ítem. A diferencia de existencias, acá **no es solo para el
 * Excel**: el listado también lo necesita, porque sin él el backend no
 * devuelve las columnas de costo.
 *
 * El ERP legacy mandaba `informe_existencia` en su descarga de Excel pese a
 * consultar la lista con `informe_inventario_valorizado` — el Excel salía sin
 * costos. Acá se usa el mismo serializador en ambos lados.
 *
 * TODO(backend): confirmar el nombre del serializador en el API nuevo y que
 * viaje en el body del POST (el legacy lo mandaba como query param de un GET).
 */
export const INVENTARIO_VALORIZADO_SERIALIZADOR = 'informe_inventario_valorizado';

/**
 * Filtro implícito del informe: solo ítems que manejan inventario. No se
 * declara en la UI y va **antes** de los filtros del usuario, así que este no
 * lo puede pisar (replica los filtros permanentes del legacy).
 */
const INVENTARIO_VALORIZADO_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'inventario', operator: 'eq', value: true },
];

/**
 * Servicio HTTP del informe **Inventario valorizado**.
 *
 * Informe de solo lectura sobre el master de ítems: `list` (página paginada) y
 * `exportUrl` (descarga de Excel). Mismo recurso que existencias, pero pidiendo
 * el serializador que agrega los costos.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class InventarioValorizadoService extends BaseHttpService {
  private readonly resourcePath = INVENTARIO_VALORIZADO_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${INVENTARIO_VALORIZADO_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<InventarioValorizado>> {
    return this.post<PaginatedResponse<InventarioValorizado>>(
      this.resourcePath + 'lista/',
      {
        ...buildListBody(query, { baseFilters: INVENTARIO_VALORIZADO_BASE_FILTERS }),
        serializador: INVENTARIO_VALORIZADO_SERIALIZADOR,
      },
      buildListParams(query),
    );
  }

  /** Filtros implícitos, expuestos para que la exportación mande los mismos. */
  get baseFilters(): readonly FilterCondition[] {
    return INVENTARIO_VALORIZADO_BASE_FILTERS;
  }
}
