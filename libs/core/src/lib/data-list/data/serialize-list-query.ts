import { HttpParams } from '@angular/common/http';
import type { FilterCondition, ListQuery, SortSpec } from './list-query.types';

/**
 * Convención de naming para los `HttpParams` que se envían al backend.
 * Documentada aquí para que todos los servicios usen las mismas claves.
 */
const PARAM_NAMES = {
  page: 'page',
  ordering: 'ordering',
} as const;

/**
 * Serializa un `ListQuery` (estructura agnóstica del transporte) a los
 * `HttpParams` que entiende el backend.
 *
 * Convenciones:
 *  - Página 1-based en el wire (el framework la maneja 0-based).
 *  - Filtros con operador `eq` se envían como `field=value`.
 *  - Filtros con otro operador se envían como `field__operator=value`
 *    (alineado con Django REST framework).
 *  - Sort se concatena en un solo `ordering` con `-` para descendente.
 *
 * Es una función pura — facilita testing y permite que cualquier service
 * (gateway HTTP del framework o servicio HTTP de un master) la reuse sin
 * duplicar la convención.
 */
export function serializeListQuery(query: ListQuery): HttpParams {
  let params = new HttpParams().set(PARAM_NAMES.page, String(query.page + 1));

  for (const condition of query.filters) {
    params = appendFilter(params, condition);
  }

  if (query.sort.length > 0) {
    params = params.set(PARAM_NAMES.ordering, encodeSort(query.sort));
  }

  return params;
}

function appendFilter(params: HttpParams, condition: FilterCondition): HttpParams {
  const key =
    condition.operator === 'eq' ? condition.field : `${condition.field}__${condition.operator}`;
  const serialized = Array.isArray(condition.value)
    ? condition.value.join(',')
    : String(condition.value);
  return params.set(key, serialized);
}

function encodeSort(sort: readonly SortSpec[]): string {
  return sort.map((spec) => (spec.direction === 'desc' ? `-${spec.field}` : spec.field)).join(',');
}
