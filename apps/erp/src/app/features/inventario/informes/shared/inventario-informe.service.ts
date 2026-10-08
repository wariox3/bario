import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildFiltros,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';

/**
 * Punto único de los informes de inventario. Dos acciones, y **no reciben el
 * mismo body**:
 *
 * | Acción   | Body                                 |
 * | -------- | ------------------------------------ |
 * | `lista/` | `{ informe, filtros, ordenamientos }` |
 * | `excel/` | `{ informe, filtros }`               |
 */
export const INVENTARIO_INFORME_ENDPOINT = '/inventario/informe/';

/**
 * Los cuatro informes del enum. Cada uno acota el queryset y elige su serializer,
 * así que **no hay filtros base que mandar desde el front**: el discriminador ya
 * los encapsula (antes cada pantalla pegaba a un master distinto y agregaba un
 * `inventario = true` a mano).
 */
export type InventarioInformeId =
  | 'existencia'
  | 'existencia_almacen'
  | 'inventario_valorizado'
  | 'historial_movimiento';

/**
 * Base de los servicios de los informes de inventario.
 *
 * Cada informe solo declara su `informe`; el resto —las dos acciones, la
 * paginación por query params, la forma de cada body— vive acá.
 *
 * `lista/` **acepta `ordenamientos`** —a diferencia de los informes contables,
 * que los rechazan—, pero `excel/` **no**. Las tablas de estos informes no
 * ordenan justamente por eso: con la cabecera ordenable, la pantalla y el
 * archivo descargado saldrían en órdenes distintos sin que nadie lo avise. Si
 * algún día `excel/` los acepta, alcanza con volver a marcar las columnas.
 *
 * No tienen acción de totales ni parámetros de periodo: son listados, no
 * reportes que se generan.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
export abstract class InventarioInformeService<TRow> extends BaseHttpService {
  /** Discriminador que el backend lee del body para elegir el informe. */
  protected abstract readonly informe: InventarioInformeId;

  /** URL de la descarga de Excel (la usa `FileDownloadService`). */
  readonly exportUrl = `${INVENTARIO_INFORME_ENDPOINT}excel/`;

  /** Una página del informe. */
  list(query: ListQuery): Observable<PaginatedResponse<TRow>> {
    return this.post<PaginatedResponse<TRow>>(
      `${INVENTARIO_INFORME_ENDPOINT}lista/`,
      { informe: this.informe, ...buildListBody(query) },
      buildListParams(query),
    );
  }

  /**
   * Body de la descarga. **Solo filtros**: `excel/` no acepta `ordenamientos`,
   * así que el archivo sale con el orden que fije el backend y no con el de la
   * tabla. Se arma acá y no en cada página justamente para que ninguna vuelva a
   * mandar el orden creyendo que se respeta.
   */
  buildExcelBody(filters: readonly FilterCondition[]): Record<string, unknown> {
    return { informe: this.informe, filtros: buildFiltros(filters) };
  }
}
