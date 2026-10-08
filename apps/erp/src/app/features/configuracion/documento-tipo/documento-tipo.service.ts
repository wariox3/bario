import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  DocumentoTipo,
  DocumentoTipoActualizado,
  DocumentoTipoPayload,
} from './documento-tipo.model';

/**
 * Servicio HTTP del catálogo de tipos de documento.
 *
 * Tenant-scoped (cada empresa configura los suyos). El listado usa el `lista/`
 * estándar del ERP: POST con `filtros` y `ordenamientos` en el cuerpo, y la
 * paginación (`page` / `limit`) en los query-params. Por eso el front decide el
 * tamaño de página y el orden, cosa que el `GET` plano del recurso no permitía.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoTipoService extends BaseHttpService {
  private readonly resourcePath = '/general/documento-tipo/';

  list(query: ListQuery): Observable<PaginatedResponse<DocumentoTipo>> {
    return this.post<PaginatedResponse<DocumentoTipo>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /**
   * Actualiza lo configurable del tipo. Va por PATCH y no por PUT: el PUT exige
   * `consecutivo` y no admite omitir nada, y acá siempre mandamos los campos
   * juntos pero sin comprometernos a que el backend los siga exigiendo.
   */
  update(id: number, payload: DocumentoTipoPayload): Observable<DocumentoTipoActualizado> {
    return this.patch<DocumentoTipoActualizado>(`${this.resourcePath}${id}/`, payload);
  }
}
