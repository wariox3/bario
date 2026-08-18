import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Movimiento } from './movimiento.model';

/** Endpoint del libro de movimientos contables. */
export const MOVIMIENTO_ENDPOINT = '/contabilidad/movimiento/';

/**
 * Serializador de la exportación a Excel. Lo declaraba igual el ERP legacy
 * (`serializador: 'informe_movimiento'` + `excel_informe: 'True'`).
 *
 * TODO(backend): confirmar que `/contabilidad/movimiento/excel/` lo acepte en el
 * body del POST (el legacy lo mandaba como query param de un GET).
 */
export const MOVIMIENTO_SERIALIZADOR = 'informe_movimiento';

/**
 * Resultado de la importación masiva. Shape provisional: crece cuando el backend
 * defina su contrato (mismo criterio que el resto de importaciones del ERP).
 */
export interface MovimientoImportResult {
  readonly imported_count: number;
  readonly errors?: ReadonlyArray<{
    readonly row: number;
    readonly field?: string;
    readonly message: string;
  }>;
}

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
  importar(file: File): Observable<MovimientoImportResult> {
    return this.postFile<MovimientoImportResult>(`${this.resourcePath}importar/`, file);
  }
}
