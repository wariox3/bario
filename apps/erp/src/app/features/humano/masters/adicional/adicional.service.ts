import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Adicional, AdicionalPayload } from './adicional.model';

@Injectable({ providedIn: 'root' })
export class AdicionalService extends BaseHttpService {
  private readonly resourcePath = '/humano/adicional/';

  list(query: ListQuery): Observable<PaginatedResponse<Adicional>> {
    return this.post<PaginatedResponse<Adicional>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Adicional> {
    return this.get<Adicional>(`${this.resourcePath}${id}/`);
  }

  create(payload: AdicionalPayload): Observable<Adicional> {
    return this.post<Adicional>(this.resourcePath, payload);
  }

  update(id: number, payload: AdicionalPayload): Observable<Adicional> {
    return this.put<Adicional>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Importa adicionales desde un Excel (multipart, campo `archivo`). El backend
   * procesa todo o nada: si una fila falla, no guarda ninguna.
   *
   * `contexto` viaja como campos extra del multipart. La programación manda
   * `programacion_id` para que lo importado quede colgado de ella, como hacía el
   * ERP anterior; el schema del `importar/` solo declara `archivo`.
   */
  importar(file: File, contexto?: { readonly programacion_id: number }): Observable<unknown> {
    return this.postFile<unknown>(`${this.resourcePath}importar/`, file, contexto);
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
