import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Prototipo, PrototipoPayload } from './prototipo.model';
import type { ProgramacionDetalleResponse } from './programacion.model';

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
   * `results`. Lo usa el modal de prototipo dentro de la programación.
   */
  listByDetalle(documentoDetalleId: number): Observable<readonly Prototipo[]> {
    return this.get<PaginatedResponse<Prototipo>>(this.resourcePath, {
      documento_detalle: documentoDetalleId,
    }).pipe(map((res) => res.results));
  }

  /**
   * Listado paginado para el **administrador de prototipos** (master de solo
   * lectura): `POST /turno/prototipo/lista/` con `{ filtros, ordenamientos }` y
   * la paginación por query params, igual que el resto de masters del módulo.
   */
  list(query: ListQuery): Observable<PaginatedResponse<Prototipo>> {
    return this.post<PaginatedResponse<Prototipo>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /** Ficha de un prototipo por id (`GET /turno/prototipo/:id/`) — detalle del master. */
  getById(id: number): Observable<Prototipo> {
    return this.get<Prototipo>(`${this.resourcePath}${id}/`);
  }

  create(payload: PrototipoPayload): Observable<Prototipo> {
    return this.post<Prototipo>(this.resourcePath, payload);
  }

  update(id: number, payload: PrototipoPayload): Observable<Prototipo> {
    return this.put<Prototipo>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Simula (dry-run) los turnos que generaría el prototipo del puesto sin
   * persistirlos: `POST /turno/programacion-simulacion/simular/` con
   * `{ documento_detalle_id, anio, mes }`. Es un recurso aparte del prototipo
   * (no cuelga de `resourcePath`). El año/mes los elige el usuario en el modal
   * (selector de la barra de acciones) para simular el período deseado.
   *
   * TODO(prototipo): tipar la respuesta cuando el backend confirme su forma
   * (por ahora `unknown`, se inspecciona en el `console.log` del componente).
   */
  simular(documentoDetalleId: number, anio: number, mes: number): Observable<unknown> {
    return this.post<unknown>('/turno/programacion-simulacion/simular/', {
      documento_detalle_id: documentoDetalleId,
      anio,
      mes,
    });
  }

  /**
   * Trae el **detalle** de la última simulación de un puesto:
   * `GET /turno/programacion-simulacion/detalle/?documento_detalle=<documento_detalle_id>`.
   * Se llama después de `simular` (que solo devuelve el conteo `{ creados }`) para
   * obtener los datos con que se pinta la tabla de vista previa del modal.
   *
   * Devuelve el **mismo shape** que el calendario de la programación
   * (`ProgramacionDetalleResponse`: cabecera + `fechas` + `filas`), así que la
   * vista previa reusa esos tipos.
   */
  detalleSimulacion(documentoDetalleId: number): Observable<ProgramacionDetalleResponse> {
    return this.get<ProgramacionDetalleResponse>('/turno/programacion-simulacion/detalle/', {
      documento_detalle: documentoDetalleId,
    });
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
