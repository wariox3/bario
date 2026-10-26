import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  fetchAllPages,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  ConceptoCuenta,
  ConceptoCuentaActualizarPayload,
  ConceptoCuentaCrearPayload,
} from './concepto-cuenta.model';

/**
 * Servicio HTTP de las cuentas por tipo de costo de cada concepto.
 *
 * El listado es el `lista/` estándar del ERP filtrado por concepto (confirmado
 * por backend). PENDIENTE (backend): POST, PATCH y DELETE siguen la convención
 * del resto de recursos y no están confirmados; si cambian, el ajuste queda
 * acotado a este archivo.
 */
@Injectable({ providedIn: 'root' })
export class ConceptoCuentaService extends BaseHttpService {
  private readonly resourcePath = '/humano/concepto-cuenta/';

  /** Las cuentas de un concepto, todas en un arreglo (recorre las páginas). */
  listar(conceptoId: number): Observable<readonly ConceptoCuenta[]> {
    const query: ListQuery = {
      filters: [{ field: 'concepto_id', operator: 'eq', value: conceptoId }],
      sort: [{ field: 'id', direction: 'asc' }],
      page: 0,
    };
    return fetchAllPages((page) =>
      this.post<PaginatedResponse<ConceptoCuenta>>(
        `${this.resourcePath}lista/`,
        buildListBody(query),
        { page },
      ),
    );
  }

  crear(payload: ConceptoCuentaCrearPayload): Observable<ConceptoCuenta> {
    return this.post<ConceptoCuenta>(this.resourcePath, payload);
  }

  update(id: number, payload: ConceptoCuentaActualizarPayload): Observable<unknown> {
    return this.patch<unknown>(`${this.resourcePath}${id}/`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.delete(`${this.resourcePath}${id}/`);
  }
}
