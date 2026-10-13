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
   * Emite un lote de nóminas a la DIAN en un solo request (`{ ids }`). Cada una
   * va por su cuenta: el 200 trae `emitidos` y `con_error`, y las que fallaron
   * quedan con `estado_electronico_error`. Solo falla lo que no es de ninguna
   * (400 sin asistente o emisor, 502 si el servicio no responde); ese aviso lo
   * da la pantalla con el motivo, sin el del interceptor.
   */
  emitir(documentoIds: readonly number[]): Observable<EmitirResultado> {
    return this.post<EmitirResultado>(
      `${DOCUMENTO_ENDPOINT}emitir/`,
      { ids: documentoIds },
      undefined,
      { errorToast: false },
    );
  }

  /** Descarta una nómina del envío electrónico (irreversible). */
  descartar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}electronico_descartar/`, { id });
  }
}
