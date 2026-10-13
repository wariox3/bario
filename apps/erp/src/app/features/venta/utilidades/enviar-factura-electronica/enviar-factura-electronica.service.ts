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
import type { DocumentoElectronicoRow } from './enviar-factura-electronica.model';

/** Endpoint de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Servicio HTTP de la utilidad **Enviar factura electrónica**.
 *
 * Tres responsabilidades sobre `/general/documento/`:
 *  - `listar`: página paginada de documentos, acotada por `baseFilters` (los
 *    filtros permanentes del tab) + los filtros del usuario. Reusa la
 *    convención estándar de listados (`POST …/lista/` con `{ filtros,
 *    ordenamientos }` y paginación en query params).
 *  - `emitir`: envía la selección a la DIAN en **un** request (`{ ids }`).
 *  - `notificar` / `descartar`: notifican al cliente / marcan como no-emitible
 *    **un** documento; el componente los orquesta con `forkJoin` sobre la
 *    selección.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuesto pendiente de confirmar con backend**: los paths `notificar/` y
 * `electronico_descartar/` siguen vigentes en reddocapi.uk.
 */
@Injectable({ providedIn: 'root' })
export class EnviarFacturaElectronicaService extends BaseHttpService {
  /**
   * Lista documentos combinando los filtros permanentes del tab (`baseFilters`)
   * con los filtros/orden/paginación del `ListQuery` del usuario.
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

  /** Notifica al cliente un documento ya emitido. */
  notificar(documentoId: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}notificar/`, { documento_id: documentoId });
  }

  /** Descarta un documento del envío electrónico (irreversible). */
  descartar(id: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}electronico_descartar/`, { id });
  }
}
