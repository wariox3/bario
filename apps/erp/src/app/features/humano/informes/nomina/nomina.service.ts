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
import type { NominaInforme } from './nomina.model';

/** Endpoint del informe: el master de documentos (acciones `lista/`, `excel/`). */
export const NOMINA_INFORME_ENDPOINT = '/general/documento/';

/**
 * Serializador que aplana el documento con los campos de la familia humano
 * (salario, devengado/deducción). Sin él el backend devuelve el documento con
 * su desglose fiscal, que la nómina no usa.
 *
 * TODO(backend): confirmar el nombre en el API nuevo y que viaje en el body del
 * POST (el legacy lo mandaba como query param de un GET).
 */
export const NOMINA_INFORME_SERIALIZADOR = 'nomina';

/**
 * Serializador de la exportación — distinto al del listado: el Excel trae el
 * informe completo, no la página que pinta la tabla.
 */
export const NOMINA_INFORME_EXPORT_SERIALIZADOR = 'informe_nomina';

/**
 * Filtro implícito del informe: solo documentos de la **clase nómina**.
 *
 * `701` es el `documento_clase_id` de nómina en el backend — no confundir con
 * el `documento_tipo_id` (14) con el que el framework discrimina el documento.
 * La clase agrupa a los tipos, y ahí está la diferencia con la lista del
 * documento de nómina: **esa filtra por tipo, este por clase**, así que el
 * informe alcanza a cualquier otro tipo que el tenant cuelgue de la 701.
 *
 * Va **antes** de los filtros del usuario, así que este no lo puede pisar.
 */
const NOMINA_INFORME_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'documento_tipo__documento_clase_id', operator: 'eq', value: 701 },
];

/**
 * Servicio HTTP del informe **Nómina**.
 *
 * Informe de solo lectura sobre el master de documentos: `list` (página
 * paginada) y `exportUrl` (descarga de Excel). Las nóminas las emite el proceso
 * de liquidación, así que no hay crear/editar/eliminar.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaInformeService extends BaseHttpService {
  private readonly resourcePath = NOMINA_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${NOMINA_INFORME_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<NominaInforme>> {
    return this.post<PaginatedResponse<NominaInforme>>(
      this.resourcePath + 'lista/',
      {
        ...buildListBody(query, { baseFilters: NOMINA_INFORME_BASE_FILTERS }),
        serializador: NOMINA_INFORME_SERIALIZADOR,
      },
      buildListParams(query),
    );
  }

  /** Filtros implícitos, expuestos para que la exportación mande los mismos. */
  get baseFilters(): readonly FilterCondition[] {
    return NOMINA_INFORME_BASE_FILTERS;
  }
}
