import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { EXOGENA_FORMATO_FILTER_FIELD } from './exogena.constants';
import type {
  Exogena,
  ExogenaCargarFormatosRespuesta,
  ExogenaCrearPayload,
  ExogenaEditarPayload,
  ExogenaFormato,
} from './exogena.model';

/** Acceso HTTP a la exógena por año y a los formatos que la componen. */
@Injectable({ providedIn: 'root' })
export class ExogenaService extends BaseHttpService {
  private readonly resourcePath = '/contabilidad/exogena/';
  private readonly detallePath = '/contabilidad/exogena-detalle/';

  list(query: ListQuery): Observable<PaginatedResponse<Exogena>> {
    return this.post<PaginatedResponse<Exogena>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Exogena> {
    return this.get<Exogena>(`${this.resourcePath}${id}/`);
  }

  create(payload: ExogenaCrearPayload): Observable<Exogena> {
    return this.post<Exogena>(this.resourcePath, payload);
  }

  update(id: number, payload: ExogenaEditarPayload): Observable<Exogena> {
    return this.patch<Exogena>(`${this.resourcePath}${id}/`, payload);
  }

  /** Borra la exógena con sus formatos. Quien llama avisa el error: sin toast propio. */
  remove(id: number): Observable<void> {
    return this.delete<void>(`${this.resourcePath}${id}/`, { errorToast: false });
  }

  /** Agrega los formatos del catálogo que le falten; los que ya tiene no se tocan. */
  cargarFormatos(id: number): Observable<ExogenaCargarFormatosRespuesta> {
    return this.post<ExogenaCargarFormatosRespuesta>(
      `${this.resourcePath}${id}/cargar-formatos/`,
      {},
    );
  }

  /** Una página (base 0) de los formatos de una exógena. */
  listarFormatos(exogenaId: number, page: number): Observable<PaginatedResponse<ExogenaFormato>> {
    const query: ListQuery = {
      filters: [{ field: EXOGENA_FORMATO_FILTER_FIELD, operator: 'eq', value: exogenaId }],
      sort: [{ field: 'id', direction: 'asc' }],
      page,
    };
    return this.post<PaginatedResponse<ExogenaFormato>>(
      `${this.detallePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }
}
