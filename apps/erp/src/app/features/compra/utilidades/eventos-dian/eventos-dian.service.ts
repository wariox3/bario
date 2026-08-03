import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { EventosDianRow } from './eventos-dian.model';
import { EVENTO_COMPRA_SERIALIZADOR } from './eventos-dian.constants';

/** Endpoint de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/** Payload de emisión de un evento de acuse DIAN (recibo/recepción/aceptación). */
export interface EmitirEventoPayload {
  readonly id: number;
  readonly evento_id: number;
  readonly nombre: string;
  readonly apellido: string;
  readonly identificacion: number;
  readonly numero_identificacion: string;
  readonly cargo: string;
  readonly area: string;
  /** Solo en el evento de aceptación; el backend lo usa para no re-marcar el flag. */
  readonly estado_electronico_evento?: boolean;
}

/** Payload de actualización de la referencia del documento. */
export interface ActualizarReferenciaPayload {
  readonly id: number;
  readonly referencia_prefijo: string | null;
  readonly referencia_numero: string | number | null;
  readonly referencia_cue: string | null;
}

/**
 * Servicio HTTP de la utilidad **Eventos DIAN** (Compra).
 *
 * Cubre el ciclo de recepción de documentos electrónicos de proveedores:
 *  - `listar`: página paginada con el serializador `evento_compra` (trae el
 *    estado de los tres eventos DIAN).
 *  - `emitir`: emite el documento a la DIAN.
 *  - `emitirEvento`: envía un evento de acuse (recibo, recepción, aceptación).
 *  - `descartar`: descarta el documento del envío electrónico.
 *  - `actualizarReferencia`: corrige el prefijo/número/CUE de referencia.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuesto pendiente de confirmar con backend**: los paths y el
 * `serializador: 'evento_compra'` en el body del listado siguen vigentes.
 */
@Injectable({ providedIn: 'root' })
export class EventosDianService extends BaseHttpService {
  /** Lista documentos de evento combinando filtros permanentes + del usuario. */
  listar(
    query: ListQuery,
    baseFilters: readonly FilterCondition[],
  ): Observable<PaginatedResponse<EventosDianRow>> {
    return this.post<PaginatedResponse<EventosDianRow>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      { ...buildListBody(query, { baseFilters }), serializador: EVENTO_COMPRA_SERIALIZADOR },
      buildListParams(query),
    );
  }

  /** Emite un documento a la DIAN. */
  emitir(documentoId: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}emitir/`, { documento_id: documentoId });
  }

  /** Envía un evento de acuse DIAN (recibo del documento / del bien / aceptación). */
  emitirEvento(payload: EmitirEventoPayload): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}emitir-evento/`, payload);
  }

  /** Descarta un documento del envío electrónico (irreversible). */
  descartar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}electronico_descartar/`, { id });
  }

  /** Actualiza la referencia del documento (prefijo/número/CUE) saltando aprobado. */
  actualizarReferencia(payload: ActualizarReferenciaPayload): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}actualizar/`, {
      ...payload,
      saltar_aprobado: true,
    });
  }
}
