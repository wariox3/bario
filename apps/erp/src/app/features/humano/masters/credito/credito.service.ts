import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  DocumentoDetalleService,
  buildFiltros,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { CREDITO_PAGO_FILTER_FIELD } from './credito.constants';
import type { Credito, CreditoPayload, CreditoPago } from './credito.model';

@Injectable({ providedIn: 'root' })
export class CreditoService extends BaseHttpService {
  private readonly detalleService = inject(DocumentoDetalleService);

  private readonly resourcePath = '/humano/credito/';

  list(query: ListQuery): Observable<PaginatedResponse<Credito>> {
    return this.post<PaginatedResponse<Credito>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Credito> {
    return this.get<Credito>(`${this.resourcePath}${id}/`);
  }

  create(payload: CreditoPayload): Observable<Credito> {
    return this.post<Credito>(this.resourcePath, payload);
  }

  update(id: number, payload: CreditoPayload): Observable<Credito> {
    return this.put<Credito>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  /**
   * Una página de los pagos aplicados al crédito: cada descuento hecho al
   * empleado en una nómina.
   *
   * **No hay entidad de pagos en el backend**: son líneas de documento que
   * apuntan al crédito, así que se piden al `lista/` de `documento-detalle`
   * filtrando por la FK. La línea ya trae el tipo, la fecha y el número de su
   * documento, y el valor descontado en `deduccion`.
   */
  pagos(id: number, page: number): Observable<PaginatedResponse<CreditoPago>> {
    return this.detalleService.listarPaginadoPorFiltros<CreditoPago>(
      buildFiltros([{ field: CREDITO_PAGO_FILTER_FIELD, operator: 'eq', value: id }]),
      page,
    );
  }
}
