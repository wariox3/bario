import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  Novedad,
  NovedadInterrumpirPayload,
  NovedadInterrumpirResponse,
  NovedadPayload,
} from './novedad.model';

@Injectable({ providedIn: 'root' })
export class NovedadService extends BaseHttpService {
  private readonly resourcePath = '/humano/novedad/';

  /** PDF del formato de vacaciones (`{ id }`), aprobada o no. Solo tipo vacaciones. */
  readonly imprimirUrl = `${this.resourcePath}imprimir/`;

  list(query: ListQuery): Observable<PaginatedResponse<Novedad>> {
    return this.post<PaginatedResponse<Novedad>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Novedad> {
    return this.get<Novedad>(`${this.resourcePath}${id}/`);
  }

  create(payload: NovedadPayload): Observable<Novedad> {
    return this.post<Novedad>(this.resourcePath, payload);
  }

  update(id: number, payload: NovedadPayload): Observable<Novedad> {
    return this.put<Novedad>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Aprueba una vacación. Solo la primera pendiente del contrato; si no, el
   * backend responde 400 con el `detail` que dice cuál va primero. Responde la
   * novedad actualizada. Sin toast del interceptor (que calla los 400): el error
   * lo avisa la ficha, una sola vez sea cual sea el status.
   */
  aprobar(id: number): Observable<Novedad> {
    return this.post<Novedad>(`${this.resourcePath}aprobar/`, { id }, undefined, {
      errorToast: false,
    });
  }

  /**
   * Revierte la aprobación. **Supuesto:** el backend todavía no tiene `desaprobar/`;
   * se asume el mismo contrato que `aprobar/` (`{ id }` → la novedad). Mientras no
   * exista responde 404 y la ficha lo avisa. Sin toast del interceptor, como `aprobar`.
   */
  desaprobar(id: number): Observable<Novedad> {
    return this.post<Novedad>(`${this.resourcePath}desaprobar/`, { id }, undefined, {
      errorToast: false,
    });
  }

  /**
   * Deja una vacación con las fechas y los días que alcanzó a disfrutar antes de
   * una incapacidad. Vale aprobada (si es la última aprobada del contrato), pero
   * no con días en dinero. El 400 trae el `detail` y lo avisa el modal con
   * `FormErrorService`; el resto (500, 403, 404) lo avisa el interceptor. Por eso
   * **no** lleva `errorToast: false`: `FormErrorService` ignora los no-validación
   * y, apagado el interceptor, un 500 quedaría callado.
   */
  interrumpir(payload: NovedadInterrumpirPayload): Observable<NovedadInterrumpirResponse> {
    return this.post<NovedadInterrumpirResponse>(
      `${this.resourcePath}interrumpir-vacacion/`,
      payload,
    );
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
