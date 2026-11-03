import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { CuentaBanco, CuentaBancoPayload } from './cuenta-banco.model';

@Injectable({ providedIn: 'root' })
export class CuentaBancoService extends BaseHttpService {
  private readonly resourcePath = '/general/cuenta-banco/';

  list(query: ListQuery): Observable<PaginatedResponse<CuentaBanco>> {
    return this.post<PaginatedResponse<CuentaBanco>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<CuentaBanco> {
    return this.get<CuentaBanco>(`${this.resourcePath}${id}/`);
  }

  create(payload: CuentaBancoPayload): Observable<CuentaBanco> {
    return this.post<CuentaBanco>(this.resourcePath, payload);
  }

  update(id: number, payload: CuentaBancoPayload): Observable<CuentaBanco> {
    return this.put<CuentaBanco>(`${this.resourcePath}${id}/`, payload);
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
