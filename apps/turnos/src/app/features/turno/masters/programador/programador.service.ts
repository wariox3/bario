import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Programador, ProgramadorPayload } from './programador.model';

@Injectable({ providedIn: 'root' })
export class ProgramadorService extends BaseHttpService {
  private readonly resourcePath = '/turno/programador/';

  list(query: ListQuery): Observable<PaginatedResponse<Programador>> {
    return this.post<PaginatedResponse<Programador>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Programador> {
    return this.get<Programador>(`${this.resourcePath}${id}/`);
  }

  create(payload: ProgramadorPayload): Observable<Programador> {
    return this.post<Programador>(this.resourcePath, payload);
  }

  update(id: number, payload: ProgramadorPayload): Observable<Programador> {
    return this.put<Programador>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }
}
