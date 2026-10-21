import type { ParamValue } from '../../services/base-http.service';
import type {
  FilterCondition,
  FilterLogic,
  FilterOperator,
  ListQuery,
  SortSpec,
} from './list-query.types';

/**
 * Serialización del `ListQuery` genérico al **body** que esperan los endpoints
 * `POST <recurso>/lista/` del backend (contactos, documentos, demás masters).
 *
 * Forma del body:
 * ```json
 * {
 *   "filtros": [{ "propiedad": "nombre_corto", "operador": "contiene", "valor": "m" }],
 *   "ordenamientos": ["-nombre_corto"]
 * }
 * ```
 *
 * La **paginación NO viaja en el body**: el backend (Django REST Framework) la
 * lee del query param `?page=…` de la URL. Por eso `buildListBody` solo arma
 * `filtros`/`ordenamientos` y la página se construye aparte con
 * `buildListParams` (que el servicio pasa como query params del POST).
 *
 * El front trabaja con operadores semánticos (`FilterOperator`); aquí se
 * traducen 1:1 al vocabulario de `operador` que confirmó el backend. Mantener
 * el mapeo centralizado evita que cada servicio invente el suyo.
 */

/**
 * Tamaño de página **fijo** del backend: todas sus listas paginan de a 25 e
 * ignoran cualquier `limit`/`page_size` que se mande. Toda tabla paginada
 * contra el backend usa este valor; pedir otro tamaño solo desalinea el
 * paginador con lo que llega (se ven filas de menos y la última página
 * responde 404 «Página inválida»).
 *
 * Para traer **todo** un recurso, recorrer las páginas con `fetchAllPages`.
 */
export const LIST_PAGE_SIZE = 25;

/** Nombre del query param de paginación que espera el backend (1-based). */
export const LIST_PAGINATION_PARAMS = {
  page: 'page',
} as const;

/**
 * Construye los query params de paginación a partir del `ListQuery`.
 *
 * El `ListQuery` maneja la página 0-based; en el wire va 1-based. El servicio
 * los pasa como `params` del POST.
 */
export function buildListParams(query: ListQuery): Record<string, ParamValue> {
  return {
    [LIST_PAGINATION_PARAMS.page]: query.page + 1,
  };
}

/**
 * Mapeo de operadores semánticos al string que el backend espera en `operador`.
 * Vocabulario autoritativo confirmado por backend:
 * `=, !=, >, >=, <, <=, contiene, comienza_con, termina_con, in, is_null`.
 */
export const BACKEND_OPERATOR: Readonly<Record<FilterOperator, string>> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  contains: 'contiene',
  startsWith: 'comienza_con',
  endsWith: 'termina_con',
  in: 'in',
  isNull: 'is_null',
};

/** Filtro tal como lo espera el backend dentro de `filtros`. */
export interface BackendFilter {
  readonly propiedad: string;
  readonly operador: string;
  /** El operador `in` lleva la lista como array: `["SETP", "EPOS"]`. */
  readonly valor: string | number | boolean | readonly (string | number)[];
  /**
   * Cómo se encadena con el filtro anterior. El backend evalúa la lista en
   * secuencia y asume `AND`, así que solo se emite cuando la condición lo
   * declara — un `operador_logico` en el primer filtro no significa nada.
   */
  readonly operador_logico?: FilterLogic;
}

/**
 * Body completo de `POST <recurso>/lista/`. La paginación viaja como query
 * params (ver `buildListParams`), no aquí.
 */
export interface AdvancedListBody {
  readonly filtros: readonly BackendFilter[];
  readonly ordenamientos: readonly string[];
}

/** Traduce un `FilterCondition` genérico al shape `{propiedad, operador, valor}`. */
function toBackendFilter(condition: FilterCondition): BackendFilter {
  return {
    propiedad: condition.field,
    operador: BACKEND_OPERATOR[condition.operator],
    valor: condition.value,
    // Solo cuando la condición lo declara: la clave ausente ya significa `AND`.
    ...(condition.logic ? { operador_logico: condition.logic } : {}),
  };
}

/** Codifica un `SortSpec` al formato `campo` / `-campo` (desc) del backend. */
function encodeSort(spec: SortSpec): string {
  return spec.direction === 'desc' ? `-${spec.field}` : spec.field;
}

/**
 * Construye el array `filtros` del body.
 * Reutilizable fuera del listado (p. ej. exportación a Excel, que solo necesita
 * los filtros activos).
 */
export function buildFiltros(filters: readonly FilterCondition[]): readonly BackendFilter[] {
  return filters.map(toBackendFilter);
}

/**
 * Construye el array `ordenamientos` del body a partir del orden de la tabla.
 * Respeta el orden de prioridad (multi-columna).
 */
export function buildOrdenamientos(sort: readonly SortSpec[]): readonly string[] {
  return sort.map(encodeSort);
}

/**
 * Arma el body completo de `POST <recurso>/lista/` a partir del `ListQuery`.
 *
 * @param opts.baseFilters Filtros inyectados por el llamador que van **antes**
 *   de los del usuario (p. ej. el `documento_tipo_id` del framework de
 *   documentos). El consumidor no los declara en la UI.
 */
export function buildListBody(
  query: ListQuery,
  opts?: { readonly baseFilters?: readonly FilterCondition[] },
): AdvancedListBody {
  const baseFilters = opts?.baseFilters ?? [];
  return {
    filtros: buildFiltros([...baseFilters, ...query.filters]),
    ordenamientos: buildOrdenamientos(query.sort),
  };
}
