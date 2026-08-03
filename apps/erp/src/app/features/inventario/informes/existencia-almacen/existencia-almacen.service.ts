import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { ExistenciaAlmacen } from './existencia-almacen.model';

/** Endpoint del informe: existencias por almacén (acciones `lista/`, `excel/`). */
export const EXISTENCIA_ALMACEN_ENDPOINT = '/inventario/existencia/';

/**
 * Serializador que el backend usa para la exportación. El ERP legacy mandaba
 * `informe_existencia` también en este informe (el mismo string que en
 * existencias consolidadas), diferenciándolos por el endpoint.
 *
 * TODO(backend): confirmar que `/inventario/existencia/excel/` lo acepte en el
 * body del POST (el legacy lo mandaba como query param de un GET).
 */
export const EXISTENCIA_ALMACEN_SERIALIZADOR = 'informe_existencia';

/**
 * Servicio HTTP del informe **Existencias por almacén**.
 *
 * Informe de solo lectura sobre el recurso de existencias: `list` (página
 * paginada) y `exportUrl` (descarga de Excel). El grano es ítem × almacén.
 *
 * A diferencia de `ExistenciaService`, **no** inyecta filtros implícitos: el
 * recurso ya contiene solo saldos de inventario, así que acotar por
 * `inventario = true` sería redundante (el legacy lo tenía comentado).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class ExistenciaAlmacenService extends BaseHttpService {
  private readonly resourcePath = EXISTENCIA_ALMACEN_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${EXISTENCIA_ALMACEN_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<ExistenciaAlmacen>> {
    return this.post<PaginatedResponse<ExistenciaAlmacen>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }
}
