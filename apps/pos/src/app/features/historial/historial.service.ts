import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type DocumentoListRowBase,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { HISTORIAL_FILTRO_BASE } from './historial.constants';

/** Fila del historial: la del listado de documentos, más los flags que pinta. */
export interface VentaHistorial extends DocumentoListRowBase {
  readonly estado_electronico?: boolean;
}

/**
 * Ventas de caja del tenant (`POST documento/lista/` acotado a los tipos POS).
 * Los filtros del usuario se suman al filtro base del tipo de documento.
 */
@Injectable({ providedIn: 'root' })
export class HistorialService extends BaseHttpService {
  list(query: ListQuery): Observable<PaginatedResponse<VentaHistorial>> {
    return this.post<PaginatedResponse<VentaHistorial>>(
      '/general/documento/lista/',
      buildListBody(query, { baseFilters: [HISTORIAL_FILTRO_BASE] }),
      buildListParams(query),
    );
  }
}
