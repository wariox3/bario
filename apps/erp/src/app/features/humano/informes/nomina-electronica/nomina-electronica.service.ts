import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { NominaElectronicaInforme } from './nomina-electronica.model';

/** Endpoint de los informes sobre documentos (acciones `lista/`, `excel/`). */
export const NOMINA_ELECTRONICA_INFORME_ENDPOINT = '/general/documento-informe/';

/**
 * Discriminador que el backend lee del body para elegir el informe. Él mismo
 * acota a los documentos de nómina electrónica, así que no se manda filtro de
 * clase.
 */
export const NOMINA_ELECTRONICA_INFORME = 'nomina_electronica';

/**
 * Servicio HTTP del informe de nómina electrónica: lista y Excel con el mismo
 * `informe`.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaElectronicaInformeService extends BaseHttpService {
  private readonly resourcePath = NOMINA_ELECTRONICA_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${NOMINA_ELECTRONICA_INFORME_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<NominaElectronicaInforme>> {
    return this.post<PaginatedResponse<NominaElectronicaInforme>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: NOMINA_ELECTRONICA_INFORME },
      buildListParams(query),
    );
  }
}
