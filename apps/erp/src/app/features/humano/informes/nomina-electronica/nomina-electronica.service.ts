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
import type { NominaElectronicaInforme } from './nomina-electronica.model';

/** Endpoint del informe: el master de documentos (acciones `lista/`, `excel/`). */
export const NOMINA_ELECTRONICA_INFORME_ENDPOINT = '/general/documento/';

/**
 * Serializador que aplana el documento con los campos de la familia humano
 * (salario, bases, devengado/deducción). Sin él el backend devuelve el
 * documento con su desglose fiscal, que la nómina no usa.
 *
 * TODO(backend): confirmar el nombre en el API nuevo y que viaje en el body del
 * POST (el legacy lo mandaba como query param de un GET).
 */
export const NOMINA_ELECTRONICA_INFORME_SERIALIZADOR = 'nomina';

/**
 * Serializador de la exportación — distinto al del listado: el Excel trae el
 * informe completo, no la página que pinta la tabla.
 */
export const NOMINA_ELECTRONICA_INFORME_EXPORT_SERIALIZADOR = 'informe_nomina_electronica';

/**
 * Filtro implícito del informe: solo documentos de la **clase nómina
 * electrónica**. Sin él el endpoint devolvería todos los documentos del tenant.
 *
 * `702` es el `documento_clase_id` de nómina electrónica en el backend — no
 * confundir con el `documento_tipo_id` (15) que discrimina el documento en el
 * framework. La clase agrupa a los tipos. Nótese que acá el lookup no lleva el
 * prefijo `documento__` que sí usa el informe de nómina detallada: ese consulta
 * las líneas, este el documento mismo.
 *
 * Va **antes** de los filtros del usuario, así que este no lo puede pisar.
 */
const NOMINA_ELECTRONICA_INFORME_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'documento_tipo__documento_clase_id', operator: 'eq', value: 702 },
];

/**
 * Servicio HTTP del informe **Nómina electrónica**.
 *
 * Informe de solo lectura sobre el master de documentos: `list` (página
 * paginada) y `exportUrl` (descarga de Excel). Las nóminas las emite el proceso
 * de liquidación, así que no hay crear/editar/eliminar.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class NominaElectronicaInformeService extends BaseHttpService {
  private readonly resourcePath = NOMINA_ELECTRONICA_INFORME_ENDPOINT;

  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${NOMINA_ELECTRONICA_INFORME_ENDPOINT}excel/`;

  list(query: ListQuery): Observable<PaginatedResponse<NominaElectronicaInforme>> {
    return this.post<PaginatedResponse<NominaElectronicaInforme>>(
      this.resourcePath + 'lista/',
      {
        ...buildListBody(query, { baseFilters: NOMINA_ELECTRONICA_INFORME_BASE_FILTERS }),
        serializador: NOMINA_ELECTRONICA_INFORME_SERIALIZADOR,
      },
      buildListParams(query),
    );
  }

  /** Filtros implícitos, expuestos para que la exportación mande los mismos. */
  get baseFilters(): readonly FilterCondition[] {
    return NOMINA_ELECTRONICA_INFORME_BASE_FILTERS;
  }
}
