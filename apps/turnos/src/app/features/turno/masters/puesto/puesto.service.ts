import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Puesto, PuestoPayload } from './puesto.model';

/**
 * Servicio HTTP de puestos.
 *
 * Master administrativo del módulo Turno. Vive como feature directo
 * (camino B del enfoque híbrido — ver docs/architecture).
 *
 * Reutiliza `buildListBody` de `@reddoc/core` para enviar el body
 * `{ filtros, ordenamientos }`. La paginación va como query params
 * (`buildListParams`), que es donde el backend la lee.
 */
@Injectable({ providedIn: 'root' })
export class PuestoService extends BaseHttpService {
  private readonly resourcePath = '/turno/puesto/';

  list(query: ListQuery): Observable<PaginatedResponse<Puesto>> {
    return this.post<PaginatedResponse<Puesto>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Puesto> {
    return this.get<Puesto>(`${this.resourcePath}${id}/`);
  }

  create(payload: PuestoPayload): Observable<Puesto> {
    return this.post<Puesto>(this.resourcePath, payload);
  }

  update(id: number, payload: PuestoPayload): Observable<Puesto> {
    return this.put<Puesto>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Elimina uno o varios puestos.
   * El backend de masters no expone batch-delete, así que paralelizamos
   * DELETEs individuales con `forkJoin`.
   */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      // forkJoin con array vacío completa sin emitir; usamos un Observable que
      // emite inmediatamente para mantener el contrato.
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }
}
