import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Sucursal, SucursalPayload } from './sucursal.model';

@Injectable({ providedIn: 'root' })
export class SucursalService extends BaseHttpService {
  private readonly resourcePath = '/humano/sucursal/';

  list(query: ListQuery): Observable<PaginatedResponse<Sucursal>> {
    return this.post<PaginatedResponse<Sucursal>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Sucursal> {
    return this.get<Sucursal>(`${this.resourcePath}${id}/`);
  }

  create(payload: SucursalPayload): Observable<Sucursal> {
    return this.post<Sucursal>(this.resourcePath, payload);
  }

  update(id: number, payload: SucursalPayload): Observable<Sucursal> {
    return this.put<Sucursal>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) =>
      this.delete<void>(`${this.resourcePath}${id}/`, { errorToast: false }),
    );
    return forkJoin(deletions).pipe(map(() => undefined));
  }
}
