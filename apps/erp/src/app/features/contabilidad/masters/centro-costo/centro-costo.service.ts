import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { CentroCosto, CentroCostoPayload } from './centro-costo.model';

@Injectable({ providedIn: 'root' })
export class CentroCostoService extends BaseHttpService {
  private readonly resourcePath = '/contabilidad/centro-costo/';

  list(query: ListQuery): Observable<PaginatedResponse<CentroCosto>> {
    return this.post<PaginatedResponse<CentroCosto>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<CentroCosto> {
    return this.get<CentroCosto>(`${this.resourcePath}${id}/`);
  }

  create(payload: CentroCostoPayload): Observable<CentroCosto> {
    return this.post<CentroCosto>(this.resourcePath, payload);
  }

  update(id: number, payload: CentroCostoPayload): Observable<CentroCosto> {
    return this.put<CentroCosto>(`${this.resourcePath}${id}/`, payload);
  }

  /** Importación masiva desde un archivo Excel. */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${this.resourcePath}importar/`, file);
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
