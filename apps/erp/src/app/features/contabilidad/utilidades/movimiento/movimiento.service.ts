import { Injectable } from '@angular/core';
import { of, type Observable } from 'rxjs';
import {
  BaseHttpService,
  buildFiltros,
  buildListBody,
  type FilterCondition,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { MOVIMIENTO_ENDPOINT, type Movimiento } from '@erp/core/contabilidad';
import { MOVIMIENTO_UTILIDAD_BASE_FILTERS } from './movimiento.constants';

/**
 * Servicio HTTP de la utilidad **Movimientos**: los movimientos de saldo
 * inicial sobre `/contabilidad/movimiento/`.
 *
 * A diferencia del informe (`movimiento-informe/`), usa el recurso propio del
 * movimiento: ahí viven la lista con `saldo_inicial`, la importación y su
 * plantilla.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class MovimientoUtilidadService extends BaseHttpService {
  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${MOVIMIENTO_ENDPOINT}excel/`;

  /** URL de la plantilla de ejemplo de la importación. */
  readonly exampleUrl = `${MOVIMIENTO_ENDPOINT}importar-ejemplo/`;

  list(query: ListQuery): Observable<PaginatedResponse<Movimiento>> {
    return this.post<PaginatedResponse<Movimiento>>(
      `${MOVIMIENTO_ENDPOINT}lista/`,
      buildListBody(query, { baseFilters: MOVIMIENTO_UTILIDAD_BASE_FILTERS }),
      buildListParams(query),
    );
  }

  /** Elimina los movimientos seleccionados (`POST eliminar/` con `{ ids }`). */
  eliminar(ids: readonly number[]): Observable<unknown> {
    if (ids.length === 0) return of(undefined);
    return this.post<unknown>(`${MOVIMIENTO_ENDPOINT}eliminar/`, { ids }, undefined, {
      errorToast: false,
    });
  }

  /**
   * Elimina todo lo que cumpla los filtros (`POST eliminar-masivo/` con
   * `{ filtros }`, los mismos de `lista/`).
   *
   * El filtro permanente de saldo inicial va siempre primero: sin él, un
   * listado sin filtros del usuario borraría todo el libro.
   */
  eliminarMasivo(filters: readonly FilterCondition[]): Observable<unknown> {
    return this.post<unknown>(
      `${MOVIMIENTO_ENDPOINT}eliminar-masivo/`,
      { filtros: buildFiltros([...MOVIMIENTO_UTILIDAD_BASE_FILTERS, ...filters]) },
      undefined,
      { errorToast: false },
    );
  }

  /** Importación masiva desde un archivo Excel (todo o nada). */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${MOVIMIENTO_ENDPOINT}importar/`, file);
  }
}
