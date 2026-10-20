import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  ConceptoCuenta,
  ConceptoCuentaActualizarPayload,
  ConceptoCuentaCrearPayload,
} from './concepto-cuenta.model';

/**
 * Un concepto tiene a lo sumo una cuenta por tipo de costo, así que una página
 * de este tamaño las trae todas.
 */
const CUENTAS_POR_CONCEPTO_MAX = 100;

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

  /** Las cuentas de un concepto, todas en un arreglo. */
  listar(conceptoId: number): Observable<readonly ConceptoCuenta[]> {
    const query: ListQuery = {
      filters: [{ field: 'concepto_id', operator: 'eq', value: conceptoId }],
      sort: [{ field: 'id', direction: 'asc' }],
      page: 0,
      pageSize: CUENTAS_POR_CONCEPTO_MAX,
    };
    return this.post<PaginatedResponse<ConceptoCuenta>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    ).pipe(map((respuesta) => respuesta.results));
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
