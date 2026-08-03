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
import type { Existencia } from './existencia.model';

/** Endpoint del informe: el master de ítems (acciones `lista/`, `excel/`). */
export const EXISTENCIA_ENDPOINT = '/general/item/';

/**
 * Serializador que el backend usa para la exportación del informe. Lo declaraba
 * igual el ERP legacy (`serializador: 'informe_existencia'` + `excel_informe`).
 *
 * TODO(backend): confirmar que `/general/item/excel/` lo acepte en el body del
 * POST (el legacy lo mandaba como query param de un GET).
 */
export const EXISTENCIA_SERIALIZADOR = 'informe_existencia';

/**
 * Filtro implícito del informe: solo ítems que manejan inventario. No se
 * declara en la UI y va **antes** de los filtros del usuario, así que este no
 * lo puede pisar (mismo comportamiento que los filtros permanentes del legacy).
 */
const EXISTENCIA_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'inventario', operator: 'eq', value: true },
];

/**
 * Servicio HTTP del informe **Existencias**.
 *
 * Informe de solo lectura sobre el master de ítems: `list` (página paginada) y
 * `exportUrl` (descarga de Excel). Sin crear/editar/eliminar — para administrar
 * ítems está el master de General.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class ExistenciaService extends BaseHttpService {
  private readonly resourcePath = EXISTENCIA_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${EXISTENCIA_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<Existencia>> {
    return this.post<PaginatedResponse<Existencia>>(
      this.resourcePath + 'lista/',
      buildListBody(query, { baseFilters: EXISTENCIA_BASE_FILTERS }),
      buildListParams(query),
    );
  }

  /** Filtros implícitos, expuestos para que la exportación mande los mismos. */
  get baseFilters(): readonly FilterCondition[] {
    return EXISTENCIA_BASE_FILTERS;
  }
}
