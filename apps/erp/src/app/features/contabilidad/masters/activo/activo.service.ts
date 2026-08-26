import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Activo, ActivoPayload } from './activo.model';

@Injectable({ providedIn: 'root' })
export class ActivoService extends BaseHttpService {
  private readonly resourcePath = '/contabilidad/activo/';

  list(query: ListQuery): Observable<PaginatedResponse<Activo>> {
    return this.post<PaginatedResponse<Activo>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Activo> {
    return this.get<Activo>(`${this.resourcePath}${id}/`);
  }

  create(payload: ActivoPayload): Observable<Activo> {
    return this.post<Activo>(this.resourcePath, payload);
  }

  update(id: number, payload: ActivoPayload): Observable<Activo> {
    return this.put<Activo>(`${this.resourcePath}${id}/`, payload);
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
