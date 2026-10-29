import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { NominaInforme } from './nomina.model';

/** Endpoint de los informes sobre documentos (acciones `lista/`, `excel/`). */
export const NOMINA_INFORME_ENDPOINT = '/general/documento-informe/';

/**
 * Discriminador que el backend lee del body para elegir el informe. Él mismo
 * acota a los documentos de nómina, así que no se manda filtro de clase.
 */
export const NOMINA_INFORME = 'nomina';

/**
 * Servicio HTTP del informe de nóminas: lista y Excel con el mismo `informe`.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaInformeService extends BaseHttpService {
  private readonly resourcePath = NOMINA_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${NOMINA_INFORME_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<NominaInforme>> {
    return this.post<PaginatedResponse<NominaInforme>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: NOMINA_INFORME },
      buildListParams(query),
    );
  }
}
