import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { BaseHttpService, type PaginatedResponse } from '@reddoc/core';
import type { Prototipo, PrototipoPayload } from './prototipo.model';

/**
 * Servicio HTTP del **prototipo** de turnos (`/turno/prototipo`).
 *
 * Movimiento del módulo Turno, ligado a la programación: por puesto
 * (`documento_detalle_id`) lista/crea/elimina las filas de prototipo con las que
 * luego se simulan y generan los turnos.
 *
 * Tenant-scoped por default (`/turno/*` vive en el schema del tenant); no se
 * sobreescribe `tenantScoped`.
 */
@Injectable({ providedIn: 'root' })
export class PrototipoService extends BaseHttpService {
  private readonly resourcePath = '/turno/prototipo/';

  /**
   * Lista las filas de prototipo de un puesto: `GET /turno/prototipo/` filtrado
   * por `documento_detalle`. La respuesta es paginada (DRF), así que se mapea a
   * `results`.
   */
  list(documentoDetalleId: number): Observable<readonly Prototipo[]> {
    return this.get<PaginatedResponse<Prototipo>>(this.resourcePath, {
      documento_detalle: documentoDetalleId,
    }).pipe(map((res) => res.results));
  }

  create(payload: PrototipoPayload): Observable<Prototipo> {
    return this.post<Prototipo>(this.resourcePath, payload);
  }

  update(id: number, payload: PrototipoPayload): Observable<Prototipo> {
    return this.put<Prototipo>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Elimina una o varias filas de prototipo. El backend no expone batch-delete,
   * así que se paralelizan DELETEs individuales con `forkJoin` (patrón de los
   * masters, ver `SecuenciaService.remove`).
   */
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
