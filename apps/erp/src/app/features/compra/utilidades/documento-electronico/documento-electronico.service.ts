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
import type { EmitirResultado } from '@erp/core/documento-electronico';
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
   * Emite un lote de documentos a la DIAN en un solo request (`{ ids }`). Cada
   * uno va por su cuenta: el 200 trae `emitidos` y `con_error`, y los que
   * fallaron quedan con `estado_electronico_error`. Solo falla lo que no es de
   * ningún documento (400 sin asistente o emisor, 502 si el servicio no
   * responde); ese aviso lo da la pantalla con el motivo, sin el del interceptor.
   */
  emitir(documentoIds: readonly number[]): Observable<EmitirResultado> {
    return this.post<EmitirResultado>(
      `${DOCUMENTO_ENDPOINT}emitir/`,
      { ids: documentoIds },
      undefined,
      { errorToast: false },
    );
  }
}
