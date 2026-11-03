import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Novedad, NovedadPayload } from './novedad.model';

@Injectable({ providedIn: 'root' })
export class NovedadService extends BaseHttpService {
  private readonly resourcePath = '/humano/novedad/';

  list(query: ListQuery): Observable<PaginatedResponse<Novedad>> {
    return this.post<PaginatedResponse<Novedad>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Novedad> {
    return this.get<Novedad>(`${this.resourcePath}${id}/`);
  }

  create(payload: NovedadPayload): Observable<Novedad> {
    return this.post<Novedad>(this.resourcePath, payload);
  }

  update(id: number, payload: NovedadPayload): Observable<Novedad> {
    return this.put<Novedad>(`${this.resourcePath}${id}/`, payload);
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
