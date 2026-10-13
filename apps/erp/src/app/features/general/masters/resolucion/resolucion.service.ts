import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  Resolucion,
  ResolucionDianPage,
  ResolucionPayload,
  ResolucionTipo,
} from './resolucion.model';

/**
 * Tope de la consulta de existentes: una página de la DIAN trae 10 resoluciones,
 * así que los dos `in` devuelven a lo sumo unas pocas.
 */
const EXISTENTES_PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class ResolucionService extends BaseHttpService {
  private readonly resourcePath = '/general/resolucion/';

  list(query: ListQuery): Observable<PaginatedResponse<Resolucion>> {
    return this.post<PaginatedResponse<Resolucion>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Resolucion> {
    return this.get<Resolucion>(`${this.resourcePath}${id}/`);
  }

  create(payload: ResolucionPayload): Observable<Resolucion> {
    return this.post<Resolucion>(this.resourcePath, payload);
  }

  update(id: number, payload: ResolucionPayload): Observable<Resolucion> {
    return this.put<Resolucion>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Valida contra la DIAN las resoluciones vigentes del módulo (`{ venta: true }`
   * o `{ compra: true }`) e inactiva las vencidas. Responde 404 sin emisor y 400
   * con el motivo en `detail` si la DIAN no devuelve rangos. Sin el toast del
   * interceptor: el aviso lo da la lista, con el motivo, para no duplicarlo.
   */
  validar(tipo: ResolucionTipo): Observable<unknown> {
    return this.post<unknown>(this.resourcePath + 'validar-dian/', { [tipo]: true }, undefined, {
      errorToast: false,
    });
  }

  /**
   * Las resoluciones que el servicio de facturación electrónica tiene del emisor
   * de la empresa, paginadas de a 10 (`page` empieza en 1). Responde 404 si la
   * empresa no tiene emisor. Sin el toast del interceptor: el modal lo avisa.
   */
  listaDian(page: number): Observable<ResolucionDianPage> {
    return this.get<ResolucionDianPage>(
      this.resourcePath + 'lista-dian/',
      { page },
      { errorToast: false },
    );
  }

  /**
   * Las resoluciones de la empresa con alguno de esos prefijos **y** alguno de
   * esos números, de **cualquier módulo**: la unicidad prefijo + número es de la
   * empresa, no de venta o compra. Alimenta el cruce del modal "Lista", que casa
   * el par. Sin toast: si falla, el modal sigue y el 400 de `importar-dian/`
   * frena el duplicado.
   */
  existentes(
    prefijos: readonly string[],
    numeros: readonly string[],
  ): Observable<readonly Resolucion[]> {
    const query: ListQuery = {
      filters: [
        { field: 'prefijo', operator: 'in', value: prefijos },
        { field: 'numero', operator: 'in', value: numeros },
      ],
      sort: [],
      page: 0,
      pageSize: EXISTENTES_PAGE_SIZE,
    };
    return this.post<PaginatedResponse<Resolucion>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
      { errorToast: false },
    ).pipe(map((response) => response.results));
  }

  /**
   * Crea en la empresa, ya validada, la resolución `id` de `lista-dian/`. Queda
   * de compra si es de documento soporte y de venta en los demás casos. 400 con
   * `detail` si ya hay una con el mismo número y prefijo; 404 sin emisor o si no
   * es de su emisor. Sin el toast del interceptor: el modal lo avisa.
   */
  importarDian(id: number): Observable<Resolucion> {
    return this.post<Resolucion>(this.resourcePath + 'importar-dian/', { id }, undefined, {
      errorToast: false,
    });
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
}
