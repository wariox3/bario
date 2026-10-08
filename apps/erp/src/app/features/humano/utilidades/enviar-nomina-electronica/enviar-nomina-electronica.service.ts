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
 *  - `emitir`: envía **una** nómina a la DIAN.
 *  - `descartar`: la marca como no-emitible (irreversible).
 *
 * Las acciones son **por documento** (un request por id): el componente las
 * orquesta con `forkJoin` sobre la selección, replicando el legacy.
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuestos pendientes de confirmar con backend**: los paths `emitir/` y
 * `electronico_descartar/` siguen vigentes en reddocapi.uk, y cada uno espera
 * su propio nombre de parámetro (`documento_id` vs `id`) — una asimetría del
 * backend que las tres utilidades electrónicas replican igual.
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

  /** Emite una nómina a la DIAN. */
  emitir(documentoId: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}emitir/`, { documento_id: documentoId });
  }

  /** Descarta una nómina del envío electrónico (irreversible). */
  descartar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}electronico_descartar/`, { id });
  }
}
