import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Impuesto, ImpuestoActualizado, ImpuestoPayload } from './impuesto.model';

/**
 * Servicio HTTP del catálogo de impuestos.
 *
 * Tenant-scoped: el catálogo es común pero la cuenta contable la elige cada
 * empresa. El listado usa el `lista/` estándar del ERP (filtros y orden en el
 * cuerpo, paginación en los query-params), igual que los tipos de documento.
 */
@Injectable({ providedIn: 'root' })
export class ImpuestoService extends BaseHttpService {
  private readonly resourcePath = '/general/impuesto/';

  list(query: ListQuery): Observable<PaginatedResponse<Impuesto>> {
    return this.post<PaginatedResponse<Impuesto>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /** Asigna (o quita, con `null`) la cuenta contable del impuesto. */
  update(id: number, payload: ImpuestoPayload): Observable<ImpuestoActualizado> {
    return this.patch<ImpuestoActualizado>(`${this.resourcePath}${id}/`, payload);
  }
}
