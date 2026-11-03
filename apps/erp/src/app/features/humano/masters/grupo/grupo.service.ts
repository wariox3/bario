import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Grupo, GrupoPayload } from './grupo.model';

@Injectable({ providedIn: 'root' })
export class GrupoService extends BaseHttpService {
  private readonly resourcePath = '/humano/grupo/';

  list(query: ListQuery): Observable<PaginatedResponse<Grupo>> {
    return this.post<PaginatedResponse<Grupo>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Grupo> {
    return this.get<Grupo>(`${this.resourcePath}${id}/`);
  }

  create(payload: GrupoPayload): Observable<Grupo> {
    return this.post<Grupo>(this.resourcePath, payload);
  }

  update(id: number, payload: GrupoPayload): Observable<Grupo> {
    return this.put<Grupo>(`${this.resourcePath}${id}/`, payload);
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
