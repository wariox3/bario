import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Resolucion, ResolucionPayload, ResolucionTipo } from './resolucion.model';

@Injectable({ providedIn: 'root' })
export class ResolucionService extends BaseHttpService {
  private readonly resourcePath = '/general/resolucion/';

  list(query: ListQuery): Observable<PaginatedResponse<Resolucion>> {
    return this.post<PaginatedResponse<Resolucion>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Resolucion> {
    return this.get<Resolucion>(`${this.resourcePath}${id}/`);
  }

  create(payload: ResolucionPayload): Observable<Resolucion> {
    return this.post<Resolucion>(this.resourcePath, payload);
  }

  update(id: number, payload: ResolucionPayload): Observable<Resolucion> {
    return this.put<Resolucion>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Valida contra la DIAN las resoluciones vigentes del módulo (`{ venta: true }`
   * o `{ compra: true }`) e inactiva las vencidas. Responde 404 sin emisor y 400
   * con el motivo en `detail` si la DIAN no devuelve rangos. Sin el toast del
   * interceptor: el aviso lo da la lista, con el motivo, para no duplicarlo.
   */
  validar(tipo: ResolucionTipo): Observable<unknown> {
    return this.post<unknown>(this.resourcePath + 'validar/', { [tipo]: true }, undefined, {
      errorToast: false,
    });
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
