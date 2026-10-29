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

/** Informe plano de movimientos: sirve `lista/` y `excel/`, sin importación. */
export const MOVIMIENTO_INFORME_ENDPOINT = '/contabilidad/movimiento-informe/';

/** Discriminador del informe: el endpoint responde 400 sin él. */
export const MOVIMIENTO_INFORME = 'movimiento';

/**
 * Servicio HTTP de la consulta de **movimientos contables**.
 *
 * Solo lectura más importación: el movimiento lo genera la contabilización de un
 * documento, no se crea ni se edita desde aquí.
 *
 * La lista y el Excel salen del informe plano de movimientos
 * (`/contabilidad/movimiento-informe/`, un renglón por movimiento, con
 * `{ filtros, ordenamientos }` y la paginación en query). La importación y su
 * plantilla siguen en `/contabilidad/movimiento/`, el único que las sirve.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class MovimientoService extends BaseHttpService {
  private readonly resourcePath = MOVIMIENTO_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${MOVIMIENTO_INFORME_ENDPOINT}excel/`;

  /** URL de la plantilla de ejemplo de la importación. */
  readonly exampleUrl = `${MOVIMIENTO_ENDPOINT}importar-ejemplo/`;

  list(query: ListQuery): Observable<PaginatedResponse<Movimiento>> {
    return this.post<PaginatedResponse<Movimiento>>(
      `${this.resourcePath}lista/`,
      { ...buildListBody(query), informe: MOVIMIENTO_INFORME },
      buildListParams(query),
    );
  }

  /**
   * Importación masiva desde un archivo Excel.
   *
   * Va contra `/contabilidad/movimiento/importar/`: el informe no importa.
   */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${MOVIMIENTO_ENDPOINT}importar/`, file);
  }
}
