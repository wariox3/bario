import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Almacen, AlmacenPayload } from './almacen.model';

/** Endpoint del master. El mismo del que cuelga `almacen/seleccionar/`. */
export const ALMACEN_ENDPOINT = '/inventario/almacen/';

/**
 * CRUD de **almacenes**.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class AlmacenService extends BaseHttpService {
  private readonly resourcePath = ALMACEN_ENDPOINT;

  list(query: ListQuery): Observable<PaginatedResponse<Almacen>> {
    return this.post<PaginatedResponse<Almacen>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Almacen> {
    return this.get<Almacen>(`${this.resourcePath}${id}/`);
  }

  create(payload: AlmacenPayload): Observable<Almacen> {
    return this.post<Almacen>(this.resourcePath, payload);
  }

  update(id: number, payload: AlmacenPayload): Observable<Almacen> {
    return this.put<Almacen>(`${this.resourcePath}${id}/`, payload);
  }

  /** Borrado múltiple: un DELETE por id, en paralelo. */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }
}
