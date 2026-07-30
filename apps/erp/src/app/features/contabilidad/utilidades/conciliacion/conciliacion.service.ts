import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  Conciliacion,
  ConciliacionDetalle,
  ConciliacionPayload,
  ConciliacionSoporte,
  ConciliacionSoporteImportResult,
} from './conciliacion.model';

/** Endpoint del master. */
export const CONCILIACION_ENDPOINT = '/contabilidad/conciliacion/';

/**
 * Endpoints de las dos colecciones hijas.
 *
 * El ERP anterior los nombra `conciliacion_detalle` y `conciliacion_soporte` (con
 * guion bajo); acá van con **guion**, que es la convención de endpoints de este
 * ERP — la misma de `documento-detalle` y `centro-costo`.
 */
export const CONCILIACION_DETALLE_ENDPOINT = '/contabilidad/conciliacion-detalle/';
export const CONCILIACION_SOPORTE_ENDPOINT = '/contabilidad/conciliacion-soporte/';

/** Serializador que el backend usa para las descargas de las tablas hijas. */
export const CONCILIACION_EXCEL_SERIALIZADOR = 'excel';

/**
 * Servicio de la **conciliación bancaria**: el CRUD del master más las seis
 * operaciones del proceso.
 *
 * El master se lista con la convención del ERP (`POST …lista/`); las dos
 * colecciones hijas se listan con **GET y el id del padre**, que es lo que hace
 * el legacy y también lo que hace `DocumentoDetalleService` con las líneas de un
 * documento — las dos convenciones coinciden ahí.
 *
 * ⚠️ Que los endpoints existan sigue siendo un supuesto: salen del legacy, con sus
 * nombres normalizados a guion. Lo que ya no está en duda es la forma del nombre.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class ConciliacionService extends BaseHttpService {
  private readonly resourcePath = CONCILIACION_ENDPOINT;

  /** URL de la exportación del listado (la usa `FileDownloadService`). */
  readonly exportUrl = `${CONCILIACION_ENDPOINT}excel/`;

  /** URL de la exportación de cada tabla hija. */
  readonly exportDetalleUrl = `${CONCILIACION_DETALLE_ENDPOINT}excel/`;
  readonly exportSoporteUrl = `${CONCILIACION_SOPORTE_ENDPOINT}excel/`;

  // ── CRUD del master ───────────────────────────────────────────────────────

  list(query: ListQuery): Observable<PaginatedResponse<Conciliacion>> {
    return this.post<PaginatedResponse<Conciliacion>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Conciliacion> {
    return this.get<Conciliacion>(`${this.resourcePath}${id}/`);
  }

  create(payload: ConciliacionPayload): Observable<Conciliacion> {
    return this.post<Conciliacion>(this.resourcePath, payload);
  }

  update(id: number, payload: ConciliacionPayload): Observable<Conciliacion> {
    return this.put<Conciliacion>(`${this.resourcePath}${id}/`, payload);
  }

  /** Elimina una o varias conciliaciones (DELETE por id, en paralelo). */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── El libro (conciliacion_detalle) ───────────────────────────────────────

  /** Página de movimientos del libro. `page` es 1-based, como espera el backend. */
  listarDetalles(
    conciliacionId: number,
    page: number,
    limit: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<ConciliacionDetalle>> {
    return this.get<PaginatedResponse<ConciliacionDetalle>>(CONCILIACION_DETALLE_ENDPOINT, {
      conciliacion_id: conciliacionId,
      page,
      limit,
      ordering: 'id',
      ...toQueryFilters(filtros),
    });
  }

  /** Trae del libro los movimientos de la cuenta en el periodo de la conciliación. */
  cargarDetalles(conciliacionId: number): Observable<unknown> {
    return this.post<unknown>(`${CONCILIACION_DETALLE_ENDPOINT}cargar/`, {
      conciliacion_id: conciliacionId,
    });
  }

  /** Borra todos los movimientos cargados. */
  limpiarDetalles(conciliacionId: number): Observable<unknown> {
    return this.post<unknown>(`${CONCILIACION_DETALLE_ENDPOINT}limpiar/`, {
      conciliacion_id: conciliacionId,
    });
  }

  // ── El extracto (conciliacion_soporte) ────────────────────────────────────

  /** Página de líneas del extracto bancario. */
  listarSoportes(
    conciliacionId: number,
    page: number,
    limit: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<ConciliacionSoporte>> {
    return this.get<PaginatedResponse<ConciliacionSoporte>>(CONCILIACION_SOPORTE_ENDPOINT, {
      conciliacion_id: conciliacionId,
      page,
      limit,
      ordering: 'id',
      ...toQueryFilters(filtros),
    });
  }

  /**
   * Importa el extracto del banco desde un Excel.
   *
   * ⚠️ El `conciliacion_id` viaja como campo del multipart junto al archivo, tal
   * como lo mandaba el legacy.
   */
  importarSoporte(conciliacionId: number, file: File): Observable<ConciliacionSoporteImportResult> {
    const form = new FormData();
    form.append('archivo', file, file.name);
    form.append('conciliacion_id', String(conciliacionId));
    return this.post<ConciliacionSoporteImportResult>(
      `${CONCILIACION_SOPORTE_ENDPOINT}cargar-soporte/`,
      form,
    );
  }

  /** Borra todas las líneas del extracto. */
  limpiarSoportes(conciliacionId: number): Observable<unknown> {
    return this.post<unknown>(`${CONCILIACION_SOPORTE_ENDPOINT}limpiar/`, {
      conciliacion_id: conciliacionId,
    });
  }

  // ── El cruce ──────────────────────────────────────────────────────────────

  /**
   * Cruza libro contra extracto y marca `estado_conciliado` en ambos lados.
   *
   * TODO(backend): confirmar si es idempotente (correrlo dos veces) y si
   * desmarca lo que dejó de cuadrar. El legacy solo recargaba la tabla después.
   */
  conciliar(conciliacionId: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}conciliar/`, { id: conciliacionId });
  }
}

/**
 * Traduce los filtros de la UI a query params planos (`campo=valor`), que es lo
 * que esperan los endpoints hijos: son GET, no el `POST …lista/` con
 * `{ filtros }` del resto del ERP.
 *
 * Solo se usa con el filtro de estado (booleano), así que alcanza con el
 * operador de igualdad; si algún día se ofrecen más filtros acá, esto crece.
 */
function toQueryFilters(
  filtros: readonly FilterCondition[],
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (const filtro of filtros) {
    if (filtro.operator !== 'eq') continue;
    const value = filtro.value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params[filtro.field] = value;
    }
  }
  return params;
}
