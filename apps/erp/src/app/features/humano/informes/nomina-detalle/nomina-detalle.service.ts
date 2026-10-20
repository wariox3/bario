import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
  DOCUMENTO_CLASE_ID,
} from '@reddoc/core';
import type { NominaDetalleInforme } from './nomina-detalle.model';

/** Endpoint del informe: las líneas de documento (acciones `lista/`, `excel/`). */
export const NOMINA_DETALLE_INFORME_ENDPOINT = '/general/documento-detalle/';

/**
 * Endpoint de la exportación. El Excel no sale de `documento-detalle/excel/`
 * sino del informe de líneas, que elige el reporte con `informe` y ya acota a
 * las nóminas (lo mismo que usa la exportación de la programación).
 */
export const NOMINA_DETALLE_INFORME_EXPORT_URL = '/general/documento-detalle-informe/excel/';

/** Identificador del reporte que el endpoint de exportación lee del body. */
export const NOMINA_DETALLE_INFORME_EXPORT_INFORME = 'nomina_detalle';

/**
 * Filtro implícito del informe: solo líneas de documentos de la **clase
 * nómina**. Sin él el endpoint devolvería las líneas de todos los documentos
 * del tenant (facturas, entradas de almacén…).
 *
 * `701` es el `documento_clase_id` de nómina en el backend — no confundir con
 * el `documento_tipo_id` (14) que discrimina el documento en el framework. La
 * clase agrupa a los tipos, así que este filtro alcanza también a las nóminas
 * de ajuste si el tenant las usa.
 *
 * Va **antes** de los filtros del usuario, así que este no lo puede pisar. La
 * exportación no lo manda: ahí la invariante la garantiza el `informe`.
 */
const NOMINA_DETALLE_INFORME_BASE_FILTERS: readonly FilterCondition[] = [
  {
    field: 'documento__documento_tipo__documento_clase_id',
    operator: 'eq',
    value: DOCUMENTO_CLASE_ID.NOMINA,
  },
];

/**
 * Servicio HTTP del informe **Nómina detallada**.
 *
 * Informe de solo lectura sobre las líneas de documento: `list` (página
 * paginada) y `exportUrl` (descarga de Excel, en el endpoint de informes). Los
 * conceptos los emite el proceso de liquidación, así que no hay
 * crear/editar/eliminar.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaDetalleInformeService extends BaseHttpService {
  private readonly resourcePath = NOMINA_DETALLE_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = NOMINA_DETALLE_INFORME_EXPORT_URL;

  list(query: ListQuery): Observable<PaginatedResponse<NominaDetalleInforme>> {
    return this.post<PaginatedResponse<NominaDetalleInforme>>(
      this.resourcePath + 'lista/',
      buildListBody(query, { baseFilters: NOMINA_DETALLE_INFORME_BASE_FILTERS }),
      buildListParams(query),
    );
  }
}
