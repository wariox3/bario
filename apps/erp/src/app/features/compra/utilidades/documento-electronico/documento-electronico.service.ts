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
import type { DocumentoElectronicoRow } from './documento-electronico.model';

/** Endpoint de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Servicio HTTP de la utilidad **Documento electrónico** (Compra).
 *
 * Dos responsabilidades sobre `/general/documento/`:
 *  - `listar`: página paginada de documentos, acotada por `baseFilters` (los
 *    filtros permanentes) + los filtros del usuario. Convención estándar de
 *    listados (`POST …/lista/` con `{ filtros, ordenamientos }` y paginación en
 *    query params).
 *  - `emitir`: envía la selección a la DIAN en **un** request (`{ ids }`).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class DocumentoElectronicoService extends BaseHttpService {
  /**
   * Lista documentos combinando los filtros permanentes (`baseFilters`) con los
   * filtros/orden/paginación del `ListQuery` del usuario.
   */
  listar(
    query: ListQuery,
    baseFilters: readonly FilterCondition[],
  ): Observable<PaginatedResponse<DocumentoElectronicoRow>> {
    return this.post<PaginatedResponse<DocumentoElectronicoRow>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      buildListBody(query, { baseFilters }),
      buildListParams(query),
    );
  }

  /**
   * Emite un lote de documentos a la DIAN en un solo request (`{ ids }`). El
   * backend valida el lote completo antes de enviar el primero: si uno no
   * cumple, no se envía ninguno.
   */
  emitir(documentoIds: readonly number[]): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}emitir/`, { ids: documentoIds });
  }
}
