import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type {
  ActualizarProgramacionMasivoPayload,
  ActualizarProgramacionPayload,
  CrearProgramacionPayload,
  EliminarProgramacionPayload,
  ProgramacionMutacionMasivoResumen,
  ProgramacionMutacionResumen,
} from './programacion.model';

/**
 * Servicio HTTP de programaciones (endpoints propios de turno).
 *
 * El **listado** y el **borrado** NO viven acá: la programación es una vista de
 * los documentos de pedido servicio (tipo 35), así que el shell del listado
 * reusa el `ENTITY_DATA_GATEWAY` del framework de documentos
 * (ver `PROGRAMACION_DOCUMENT_CONFIG`). Este servicio queda para los endpoints
 * específicos de turno que no cubre ese gateway.
 */
@Injectable({ providedIn: 'root' })
export class ProgramacionService extends BaseHttpService {
  private readonly resourcePath = '/turno/programacion/';

  /**
   * Detalle de una programación por id del documento.
   *
   * `GET /turno/programacion/detalle/?documento=<id_del_documento>` — el
   * `documento` es el id del documento de la fila (no el `documento_tipo_id`).
   *
   * TODO: tipar la respuesta cuando se confirme el shape.
   */
  getDetalle(documentoId: number): Observable<unknown> {
    return this.get<unknown>(`${this.resourcePath}detalle/`, { documento: documentoId });
  }

  /**
   * Crea la programación de un contrato en un puesto
   * (`POST /turno/programacion/crear-programacion/`). Devuelve el resumen de la
   * operación (`creados`/`actualizados`/`eliminados`).
   */
  crearProgramacion(payload: CrearProgramacionPayload): Observable<ProgramacionMutacionResumen> {
    return this.post<ProgramacionMutacionResumen>(
      `${this.resourcePath}crear-programacion/`,
      payload,
    );
  }

  /**
   * Reprograma los turnos de un contrato ya asignado a un puesto
   * (`POST /turno/programacion/actualizar-programacion/`). Mismo payload que crear;
   * el backend sobrescribe los días existentes de ese contrato y devuelve el resumen
   * de la operación (`creados`/`actualizados`/`eliminados`).
   */
  actualizarProgramacion(
    payload: ActualizarProgramacionPayload,
  ): Observable<ProgramacionMutacionResumen> {
    return this.post<ProgramacionMutacionResumen>(
      `${this.resourcePath}actualizar-programacion/`,
      payload,
    );
  }

  /**
   * Reprograma **varias líneas** de un contrato en una sola llamada
   * (`POST /turno/programacion/actualizar-programacion-masivo/`). Se dispara al
   * editar desde el nombre del contrato (todos sus puestos a la vez). Devuelve
   * `resultados[]` con el resumen de cada línea (anclado por `indice`).
   */
  actualizarProgramacionMasivo(
    payload: ActualizarProgramacionMasivoPayload,
  ): Observable<ProgramacionMutacionMasivoResumen> {
    return this.post<ProgramacionMutacionMasivoResumen>(
      `${this.resourcePath}actualizar-programacion-masivo/`,
      payload,
    );
  }

  /**
   * Elimina la programación de un contrato en un puesto
   * (`POST /turno/programacion/eliminar-programacion/`). Borra el mes de turnos
   * de ese contrato en el `documento_detalle_id` y devuelve el resumen de la
   * operación (`creados`/`actualizados`/`eliminados`).
   */
  eliminarProgramacion(
    payload: EliminarProgramacionPayload,
  ): Observable<ProgramacionMutacionResumen> {
    return this.post<ProgramacionMutacionResumen>(
      `${this.resourcePath}eliminar-programacion/`,
      payload,
    );
  }
}
