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
import type { EnviarNominaElectronicaRow } from './enviar-nomina-electronica.model';

/** Endpoint de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Servicio HTTP de la utilidad **Enviar nómina electrónica** (Humano).
 *
 * Tres responsabilidades sobre `/general/documento/`:
 *  - `listar`: página paginada, acotada por `baseFilters` (los filtros
 *    permanentes) + los filtros del usuario. Convención estándar de listados
 *    (`POST …/lista/` con `{ filtros, ordenamientos }` y paginación en query
 *    params).
 *  - `emitir`: envía la selección a la DIAN en **un** request (`{ ids }`).
 *  - `descartar`: marca **una** nómina como no-emitible (irreversible); el
 *    componente lo orquesta con `forkJoin` sobre la selección.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuesto pendiente de confirmar con backend**: el path
 * `electronico_descartar/` sigue vigente en reddocapi.uk.
 */
@Injectable({ providedIn: 'root' })
export class EnviarNominaElectronicaService extends BaseHttpService {
  /**
   * Lista nóminas combinando los filtros permanentes (`baseFilters`) con los
   * filtros/orden/paginación del `ListQuery` del usuario.
   */
  listar(
    query: ListQuery,
    baseFilters: readonly FilterCondition[],
  ): Observable<PaginatedResponse<EnviarNominaElectronicaRow>> {
    return this.post<PaginatedResponse<EnviarNominaElectronicaRow>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      buildListBody(query, { baseFilters }),
      buildListParams(query),
    );
  }

  /**
   * Emite un lote de nóminas a la DIAN en un solo request (`{ ids }`). El
   * backend valida el lote completo antes de enviar el primero: si uno no
   * cumple, no se envía ninguno.
   */
  emitir(documentoIds: readonly number[]): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}emitir/`, { ids: documentoIds });
  }

  /** Descarta una nómina del envío electrónico (irreversible). */
  descartar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}electronico_descartar/`, { id });
  }
}
