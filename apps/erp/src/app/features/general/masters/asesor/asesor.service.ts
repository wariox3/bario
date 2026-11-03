import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Asesor, AsesorPayload } from './asesor.model';

@Injectable({ providedIn: 'root' })
export class AsesorService extends BaseHttpService {
  private readonly resourcePath = '/general/asesor/';

  list(query: ListQuery): Observable<PaginatedResponse<Asesor>> {
    return this.post<PaginatedResponse<Asesor>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Asesor> {
    return this.get<Asesor>(`${this.resourcePath}${id}/`);
  }

  create(payload: AsesorPayload): Observable<Asesor> {
    return this.post<Asesor>(this.resourcePath, payload);
  }

  update(id: number, payload: AsesorPayload): Observable<Asesor> {
    return this.put<Asesor>(`${this.resourcePath}${id}/`, payload);
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
