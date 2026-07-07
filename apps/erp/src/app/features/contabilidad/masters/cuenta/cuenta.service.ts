import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Cuenta, CuentaImportResult, CuentaPayload } from './cuenta.model';

@Injectable({ providedIn: 'root' })
export class CuentaService extends BaseHttpService {
  private readonly resourcePath = '/contabilidad/cuenta/';

  list(query: ListQuery): Observable<PaginatedResponse<Cuenta>> {
    return this.post<PaginatedResponse<Cuenta>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Cuenta> {
    return this.get<Cuenta>(`${this.resourcePath}${id}/`);
  }

  create(payload: CuentaPayload): Observable<Cuenta> {
    return this.post<Cuenta>(this.resourcePath, payload);
  }

  update(id: number, payload: CuentaPayload): Observable<Cuenta> {
    return this.put<Cuenta>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Importación masiva desde un archivo Excel.
   *
   * HttpClient detecta el `FormData` y arma el `multipart/form-data` con el
   * boundary correcto — no hay que setear `Content-Type` manualmente. El campo
   * `archivo` es el contrato que espera el backend.
   */
  importar(file: File): Observable<CuentaImportResult> {
    const form = new FormData();
    form.append('archivo', file, file.name);
    return this.post<CuentaImportResult>(`${this.resourcePath}importar/`, form);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return forkJoin(ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`))).pipe(
      map(() => undefined),
    );
  }
}
