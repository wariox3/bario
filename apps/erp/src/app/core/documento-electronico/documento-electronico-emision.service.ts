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
import type { EmitirResultado } from './documento-electronico.types';
import type { DocumentoPorEmitir } from './emision-electronica.types';

const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Emisión electrónica sobre `/general/documento/`: listar lo que hay por
 * emitir, emitir, corregir la cabecera antes de emitir y descartar. Igual para facturas de venta, documentos de
 * compra y nóminas; lo que cambia son los filtros permanentes.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoElectronicoEmisionService extends BaseHttpService {
  /** Página de documentos: los filtros permanentes van antes que los del usuario. */
  listar(
    query: ListQuery,
    baseFilters: readonly FilterCondition[],
  ): Observable<PaginatedResponse<DocumentoPorEmitir>> {
    return this.post<PaginatedResponse<DocumentoPorEmitir>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      buildListBody(query, { baseFilters }),
      buildListParams(query),
    );
  }

  /**
   * Emite un lote en un solo request (`{ ids }`). Cada documento va por su
   * cuenta: el 200 trae `emitidos` y `con_error`, y los que fallaron quedan con
   * `estado_electronico_error`. Solo falla lo que no es de ningún documento (400
   * sin asistente o emisor, 502 si el servicio no responde); ese aviso lo da la
   * pantalla con el motivo, sin el del interceptor.
   */
  emitir(documentoIds: readonly number[]): Observable<EmitirResultado> {
    return this.post<EmitirResultado>(
      `${DOCUMENTO_ENDPOINT}emitir/`,
      { ids: documentoIds },
      undefined,
      { errorToast: false },
    );
  }

  /**
   * Corrige la cabecera que viaja a la DIAN (número, resolución y fechas) de
   * un documento que aún no salió. Solo viajan las claves que cambiaron. Sin el
   * toast del interceptor: el aviso lo da el diálogo, con el motivo del backend.
   */
  actualizarElectronico(id: number, cambios: object): Observable<unknown> {
    return this.post<unknown>(
      `${DOCUMENTO_ENDPOINT}actualizar-electronico/`,
      { id, ...cambios },
      undefined,
      { errorToast: false },
    );
  }

  /** Descarta un documento del envío electrónico (irreversible). */
  descartar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}electronico_descartar/`, { id });
  }
}
