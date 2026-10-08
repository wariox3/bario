import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Soporte } from './soporte.model';

/**
 * Servicio HTTP de soportes.
 *
 * Movimiento del módulo Turno (sección Movimientos). Vive como feature directo
 * (mismo patrón que camino B del enfoque híbrido — ver docs/architecture).
 *
 * Reutiliza `buildListBody` de `@reddoc/core` para enviar el body
 * `{ filtros, ordenamientos }`. La paginación va como query params
 * (`buildListParams`), que es donde el backend la lee.
 */
@Injectable({ providedIn: 'root' })
export class SoporteService extends BaseHttpService {
  private readonly resourcePath = '/turno/soporte/';

  list(query: ListQuery): Observable<PaginatedResponse<Soporte>> {
    return this.post<PaginatedResponse<Soporte>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Soporte> {
    return this.get<Soporte>(`${this.resourcePath}${id}/`);
  }

  /**
   * Elimina uno o varios soportes.
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
