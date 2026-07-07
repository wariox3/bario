import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { FormaPago, FormaPagoPayload } from './forma-pago.model';

@Injectable({ providedIn: 'root' })
export class FormaPagoService extends BaseHttpService {
  private readonly resourcePath = '/general/forma-pago/';

  list(query: ListQuery): Observable<PaginatedResponse<FormaPago>> {
    return this.post<PaginatedResponse<FormaPago>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<FormaPago> {
    return this.get<FormaPago>(`${this.resourcePath}${id}/`);
  }

  create(payload: FormaPagoPayload): Observable<FormaPago> {
    return this.post<FormaPago>(this.resourcePath, payload);
  }

  update(id: number, payload: FormaPagoPayload): Observable<FormaPago> {
    return this.put<FormaPago>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return forkJoin(ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`))).pipe(
      map(() => undefined),
    );
  }
}
