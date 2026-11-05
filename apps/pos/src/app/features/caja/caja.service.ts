import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  FileDownloadService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Caja, CajaPayload } from './caja.model';

const RECURSO = '/venta/caja/';

/** Cajas del tenant: CRUD de `venta/caja/`, con su listado y su Excel. */
@Injectable({ providedIn: 'root' })
export class CajaService extends BaseHttpService {
  private readonly descargas = inject(FileDownloadService);

  list(query: ListQuery): Observable<PaginatedResponse<Caja>> {
    return this.post<PaginatedResponse<Caja>>(
      `${RECURSO}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Caja> {
    return this.get<Caja>(`${RECURSO}${id}/`);
  }

  create(payload: CajaPayload): Observable<Caja> {
    return this.post<Caja>(RECURSO, payload);
  }

  update(id: number, payload: CajaPayload): Observable<Caja> {
    return this.put<Caja>(`${RECURSO}${id}/`, payload);
  }

  /** Sin toast global: el listado avisa del error con su propio mensaje. */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return forkJoin(
      ids.map((id) => this.delete<void>(`${RECURSO}${id}/`, { errorToast: false })),
    ).pipe(map(() => undefined));
  }

  /** El Excel acepta los mismos filtros y orden que `lista/`. */
  exportarExcel(query: ListQuery): Observable<void> {
    return this.descargas.download(`${RECURSO}excel/`, {
      method: 'POST',
      body: buildListBody(query),
      fallbackFilename: 'cajas.xlsx',
    });
  }
}
