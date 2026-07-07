import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Sede, SedePayload } from './sede.model';

@Injectable({ providedIn: 'root' })
export class SedeService extends BaseHttpService {
  private readonly resourcePath = '/general/sede/';

  list(query: ListQuery): Observable<PaginatedResponse<Sede>> {
    return this.post<PaginatedResponse<Sede>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Sede> {
    return this.get<Sede>(`${this.resourcePath}${id}/`);
  }

  create(payload: SedePayload): Observable<Sede> {
    return this.post<Sede>(this.resourcePath, payload);
  }

  update(id: number, payload: SedePayload): Observable<Sede> {
    return this.put<Sede>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return forkJoin(ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`))).pipe(
      map(() => undefined),
    );
  }
}
