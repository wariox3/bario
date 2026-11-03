import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Cargo, CargoPayload } from './cargo.model';

@Injectable({ providedIn: 'root' })
export class CargoService extends BaseHttpService {
  private readonly resourcePath = '/humano/cargo/';

  list(query: ListQuery): Observable<PaginatedResponse<Cargo>> {
    return this.post<PaginatedResponse<Cargo>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Cargo> {
    return this.get<Cargo>(`${this.resourcePath}${id}/`);
  }

  create(payload: CargoPayload): Observable<Cargo> {
    return this.post<Cargo>(this.resourcePath, payload);
  }

  update(id: number, payload: CargoPayload): Observable<Cargo> {
    return this.put<Cargo>(`${this.resourcePath}${id}/`, payload);
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
