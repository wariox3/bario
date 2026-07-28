import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { NominaDetalleInforme } from './nomina-detalle.model';

/** Endpoint del informe: las líneas de documento (acciones `lista/`, `excel/`). */
export const NOMINA_DETALLE_INFORME_ENDPOINT = '/general/documento-detalle/';

/**
 * Serializador que aplana la línea con los datos de su nómina (empleado,
 * periodo, fecha). Sin él el backend devuelve la línea cruda.
 *
 * TODO(backend): confirmar el nombre en el API nuevo y que viaje en el body del
 * POST (el legacy lo mandaba como query param de un GET).
 */
export const NOMINA_DETALLE_INFORME_SERIALIZADOR = 'nomina';

/**
 * Serializador de la exportación — distinto al del listado: el Excel trae el
 * informe completo, no la página que pinta la tabla.
 */
export const NOMINA_DETALLE_INFORME_EXPORT_SERIALIZADOR = 'informe_nomina_detalle';

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
 * Va **antes** de los filtros del usuario, así que este no lo puede pisar.
 */
const NOMINA_DETALLE_INFORME_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'documento__documento_tipo__documento_clase_id', operator: 'eq', value: 701 },
];

/**
 * Servicio HTTP del informe **Nómina detallada**.
 *
 * Informe de solo lectura sobre las líneas de documento: `list` (página
 * paginada) y `exportUrl` (descarga de Excel). Los conceptos los emite el
 * proceso de liquidación, así que no hay crear/editar/eliminar.
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
      {
        ...buildListBody(query, { baseFilters: NOMINA_DETALLE_INFORME_BASE_FILTERS }),
        serializador: NOMINA_DETALLE_INFORME_SERIALIZADOR,
      },
      buildListParams(query),
    );
  }

  /** Filtros implícitos, expuestos para que la exportación mande los mismos. */
  get baseFilters(): readonly FilterCondition[] {
    return NOMINA_DETALLE_INFORME_BASE_FILTERS;
  }
}
