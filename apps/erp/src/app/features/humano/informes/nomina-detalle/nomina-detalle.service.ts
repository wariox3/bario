import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { NominaDetalleInforme } from './nomina-detalle.model';

/** Endpoint de los informes sobre líneas de documento (acciones `lista/`, `excel/`). */
export const NOMINA_DETALLE_INFORME_ENDPOINT = '/general/documento-detalle-informe/';

/**
 * Discriminador que el backend lee del body para elegir el informe. Él mismo
 * acota a las líneas de nómina, así que no se manda filtro de clase.
 */
export const NOMINA_DETALLE_INFORME = 'nomina_detalle';

/**
 * Servicio HTTP del informe de conceptos de nómina: lista y Excel con el mismo
 * `informe`.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaDetalleInformeService extends BaseHttpService {
  private readonly resourcePath = NOMINA_DETALLE_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${NOMINA_DETALLE_INFORME_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<NominaDetalleInforme>> {
    return this.post<PaginatedResponse<NominaDetalleInforme>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: NOMINA_DETALLE_INFORME },
      buildListParams(query),
    );
  }
}
