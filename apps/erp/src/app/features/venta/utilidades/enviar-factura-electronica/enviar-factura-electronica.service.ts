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
 *  - `emitir` / `notificar`: envían **un** documento a la DIAN / al cliente.
 *  - `descartar`: marca un documento como no-emitible.
 *
 * Las acciones son **por documento** (un request por id): el componente las
 * orquesta con `forkJoin` sobre la selección, replicando el comportamiento del
 * legacy. Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 *
 * **Supuesto pendiente de confirmar con backend**: los paths `emitir/`,
 * `notificar/` y `electronico_descartar/` siguen vigentes en reddocapi.uk.
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

  /** Emite un documento a la DIAN. */
  emitir(documentoId: number): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}emitir/`, { documento_id: documentoId });
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
