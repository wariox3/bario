import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { MOVIMIENTO_ENDPOINT, type Movimiento } from '@erp/core/contabilidad';

/**
 * Servicio HTTP de la consulta de **movimientos contables**.
 *
 * Solo lectura más importación: el movimiento lo genera la contabilización de un
 * documento, no se crea ni se edita desde aquí.
 *
 * ⚠️ El ERP anterior consultaba con `GET contabilidad/movimiento/` y los filtros
 * como query params. Acá se usa la convención del ERP (`POST …lista/` con
 * `{ filtros, ordenamientos }` y la paginación en query), igual que el resto de
 * listados. Si el endpoint solo responde en GET, el fix es este servicio.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class MovimientoService extends BaseHttpService {
  private readonly resourcePath = MOVIMIENTO_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${MOVIMIENTO_ENDPOINT}excel/`;

  /** URL de la plantilla de ejemplo de la importación. */
  readonly exampleUrl = `${MOVIMIENTO_ENDPOINT}importar-ejemplo/`;

  list(query: ListQuery): Observable<PaginatedResponse<Movimiento>> {
    return this.post<PaginatedResponse<Movimiento>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /**
   * Importación masiva desde un archivo Excel.
   *
   * ⚠️ Endpoint **supuesto**: sigue la convención `importar/` de los masters. El
   * legacy importaba contra `contabilidad/movimiento` y servía la plantilla
   * desde un XLSX alojado fuera del backend.
   */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${this.resourcePath}importar/`, file);
  }
}
