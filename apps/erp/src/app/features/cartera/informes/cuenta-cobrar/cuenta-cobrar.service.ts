import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { CuentaCobrar } from './cuenta-cobrar.model';

/**
 * Identificador del informe que el backend lee del body para acotar `documento`
 * a las cuentas por cobrar aprobadas con saldo pendiente.
 */
export const CUENTA_COBRAR_INFORME = 'cobrar_pendiente';

/** Endpoint del informe (acciones: `lista/`, `exportar/`). */
export const CUENTA_COBRAR_ENDPOINT = '/general/documento-informe/';

/**
 * Servicio HTTP del informe **Cuentas por cobrar**.
 *
 * Consume el endpoint de informes `documento-informe` como **informe de solo
 * lectura**: `list` (página paginada) y `exportUrl` (descarga). El backend
 * distingue el informe por el campo `informe` que viaja en el body del POST
 * (junto a `filtros`/`ordenamientos`) — ese identificador ya encapsula los
 * filtros base (por cobrar, aprobado, pendiente > 0). La paginación va como
 * query params.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class CuentaCobrarService extends BaseHttpService {
  private readonly resourcePath = CUENTA_COBRAR_ENDPOINT;

  /** URL absoluta de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${CUENTA_COBRAR_ENDPOINT}exportar/`;

  list(query: ListQuery): Observable<PaginatedResponse<CuentaCobrar>> {
    return this.post<PaginatedResponse<CuentaCobrar>>(
      this.resourcePath + 'lista/',
      { ...buildListBody(query), informe: CUENTA_COBRAR_INFORME },
      buildListParams(query),
    );
  }
}
