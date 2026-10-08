import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Turno, TurnoPayload } from './turno.model';

/**
 * Servicio HTTP de turnos (jornadas).
 *
 * Master administrativo del módulo Turno. Vive como feature directo
 * (camino B del enfoque híbrido — ver docs/architecture).
 *
 * Reutiliza `buildListBody` de `@reddoc/core` para enviar el body
 * `{ filtros, ordenamientos }`. La paginación va como query params
 * (`buildListParams`), que es donde el backend la lee.
 *
 * Tenant-scoped por default (`/turno/*` vive en el schema del tenant); no se
 * sobreescribe `tenantScoped`.
 */
@Injectable({ providedIn: 'root' })
export class TurnoService extends BaseHttpService {
  private readonly resourcePath = '/turno/turno/';

  list(query: ListQuery): Observable<PaginatedResponse<Turno>> {
    return this.post<PaginatedResponse<Turno>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Turno> {
    return this.get<Turno>(`${this.resourcePath}${id}/`);
  }

  create(payload: TurnoPayload): Observable<Turno> {
    return this.post<Turno>(this.resourcePath, payload);
  }

  update(id: number, payload: TurnoPayload): Observable<Turno> {
    return this.put<Turno>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Elimina uno o varios turnos.
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
