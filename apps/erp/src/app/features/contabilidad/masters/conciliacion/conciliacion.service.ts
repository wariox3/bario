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

/**
 * Filtros del libro o del extracto de una conciliación: su FK más los que eligió
 * la persona. Los usan `lista/` y `excel/`, que aceptan los mismos.
 */
export function filtrosDeConciliacion(
  conciliacionId: number,
  filtros: readonly FilterCondition[] = [],
): readonly FilterCondition[] {
  return [{ field: 'conciliacion_id', operator: 'eq', value: conciliacionId }, ...filtros];
}

/** Plantilla del extracto: pide `?conciliacion=<id>` para sugerir sus fechas. */
export const CONCILIACION_SOPORTE_EJEMPLO_ENDPOINT = `${CONCILIACION_SOPORTE_ENDPOINT}importar-ejemplo/`;

/**
 * Servicio de la **conciliación bancaria**: el CRUD del master más las
 * operaciones del proceso (cargar, importar, conciliar, limpiar).
 *
 * El master y las dos colecciones hijas se listan con `POST …lista/`; las hijas
 * filtran por `conciliacion_id`. Contrato verificado contra el schema del
 * backend (2026-11-27).
 *
 * Las operaciones van con `errorToast: false`: el componente avisa todo status.
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
    const deletions = ids.map((id) =>
      this.delete<void>(`${this.resourcePath}${id}/`, { errorToast: false }),
    );
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── El libro (conciliacion_detalle) ───────────────────────────────────────

  /** Página (base 0) de movimientos del libro, del primero al último. */
  listarDetalles(
    conciliacionId: number,
    page: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<ConciliacionDetalle>> {
    return this.listarHijos<ConciliacionDetalle>(
      CONCILIACION_DETALLE_ENDPOINT,
      conciliacionId,
      page,
      filtros,
    );
  }

  /**
   * Trae como detalles los movimientos de la cuenta contable de la cuenta
   * bancaria: los del rango y los pendientes de conciliaciones anteriores. Se
   * puede repetir: solo agrega lo que falta.
   */
  cargarDetalles(conciliacionId: number): Observable<{ readonly cargados: number }> {
    return this.post<{ readonly cargados: number }>(
      `${this.resourcePath}${conciliacionId}/cargar/`,
      {},
      undefined,
      { errorToast: false },
    );
  }

  /** Borra los movimientos cargados. 400 si alguno está conciliado. */
  limpiarDetalles(conciliacionId: number): Observable<{ readonly eliminados: number }> {
    return this.post<{ readonly eliminados: number }>(
      `${CONCILIACION_DETALLE_ENDPOINT}limpiar/`,
      { conciliacion: conciliacionId },
      undefined,
      { errorToast: false },
    );
  }

  // ── El extracto (conciliacion_soporte) ────────────────────────────────────

  /** Página (base 0) de líneas del extracto bancario. */
  listarSoportes(
    conciliacionId: number,
    page: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<ConciliacionSoporte>> {
    return this.listarHijos<ConciliacionSoporte>(
      CONCILIACION_SOPORTE_ENDPOINT,
      conciliacionId,
      page,
      filtros,
    );
  }

  /**
   * Importa el extracto del banco (Fecha, Valor con signo y Detalle). Agrega, no
   * reemplaza; todo o nada.
   */
  importarSoporte(conciliacionId: number, file: File): Observable<{ readonly creados: number }> {
    return this.postFile<{ readonly creados: number }>(
      `${CONCILIACION_SOPORTE_ENDPOINT}importar/`,
      file,
      { conciliacion: conciliacionId },
    );
  }

  /** Borra todas las líneas del extracto. 400 si alguna está conciliada. */
  limpiarSoportes(conciliacionId: number): Observable<{ readonly eliminados: number }> {
    return this.post<{ readonly eliminados: number }>(
      `${CONCILIACION_SOPORTE_ENDPOINT}limpiar/`,
      { conciliacion: conciliacionId },
      undefined,
      { errorToast: false },
    );
  }

  // ── El cruce ──────────────────────────────────────────────────────────────

  /**
   * Cruza 1 a 1 libro contra extracto: mismo lado, mismo valor y fechas a no más
   * de `dias` (0 a 31). Solo toma lo pendiente, así que se puede repetir.
   */
  conciliar(conciliacionId: number, dias = 0): Observable<{ readonly conciliados: number }> {
    return this.post<{ readonly conciliados: number }>(
      `${this.resourcePath}${conciliacionId}/conciliar/`,
      { dias },
      undefined,
      { errorToast: false },
    );
  }

  /**
   * Devuelve a pendiente todo lo conciliado, en los dos lados. Es todo o nada:
   * el backend no guarda qué cruzó con qué.
   */
  desconciliar(
    conciliacionId: number,
  ): Observable<{ readonly detalles: number; readonly soportes: number }> {
    return this.post<{ readonly detalles: number; readonly soportes: number }>(
      `${this.resourcePath}${conciliacionId}/desconciliar/`,
      {},
      undefined,
      { errorToast: false },
    );
  }

  private listarHijos<T>(
    endpoint: string,
    conciliacionId: number,
    page: number,
    filtros: readonly FilterCondition[],
  ): Observable<PaginatedResponse<T>> {
    const query: ListQuery = {
      filters: filtrosDeConciliacion(conciliacionId, filtros),
      // El backend no deja ordenar por `fecha` (400). Por id sale en orden de
      // fecha igual: `cargar` crea los detalles ordenados por fecha e id.
      sort: [{ field: 'id', direction: 'asc' }],
      page,
    };
    return this.post<PaginatedResponse<T>>(
      `${endpoint}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }
}
