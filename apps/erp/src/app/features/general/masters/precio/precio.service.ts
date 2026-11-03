import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Precio, PrecioPayload } from './precio.model';

@Injectable({ providedIn: 'root' })
export class PrecioService extends BaseHttpService {
  private readonly resourcePath = '/general/precio/';

  list(query: ListQuery): Observable<PaginatedResponse<Precio>> {
    return this.post<PaginatedResponse<Precio>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Precio> {
    return this.get<Precio>(`${this.resourcePath}${id}/`);
  }

  create(payload: PrecioPayload): Observable<Precio> {
    return this.post<Precio>(this.resourcePath, payload);
  }

  update(id: number, payload: PrecioPayload): Observable<Precio> {
    return this.put<Precio>(`${this.resourcePath}${id}/`, payload);
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
