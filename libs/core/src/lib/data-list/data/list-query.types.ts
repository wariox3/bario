/**
 * Tipos del contrato de listado.
 *
 * El framework usa estos tipos como lingua franca entre los componentes base
 * y el `EntityDataGateway`. Son agnósticos al transporte (HTTP, GraphQL, etc.).
 */

/**
 * Operador de comparación soportado por el sistema de filtros.
 *
 * Se diseña pequeño y declarativo para que el backend pueda mapearlo
 * 1:1 a su DSL sin lógica adicional en el front.
 */
export type FilterOperator =
  | 'eq' // igual
  | 'neq' // distinto
  | 'gt' // mayor que
  | 'gte' // mayor o igual
  | 'lt' // menor que
  | 'lte' // menor o igual
  | 'contains' // contiene (string)
  | 'startsWith'
  | 'endsWith'
  | 'in' // valor está en una lista
  | 'isNull'; // el campo es / no es nulo (el `value` booleano indica cuál)

/**
 * Cómo se encadena una condición con la anterior. El backend evalúa la lista
 * **en secuencia** y asume `AND` cuando no se declara, así que solo hace falta
 * nombrarlo para armar un `OR`.
 */
export type FilterLogic = 'AND' | 'OR';

/**
 * Condición de filtro tal como la emite el componente de filtros
 * y la consume el gateway.
 */
export interface FilterCondition {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: string | number | boolean | readonly (string | number)[];
  /**
   * Encadenamiento con la condición anterior. Se omite en el primer filtro (no
   * hay nada con qué encadenar) y en los `AND`, que son el default del backend.
   */
  readonly logic?: FilterLogic;
}

/** Dirección de ordenamiento. */
export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  readonly field: string;
  readonly direction: SortDirection;
}

/** Parámetros completos de una consulta de listado paginada. */
export interface ListQuery {
  readonly filters: readonly FilterCondition[];
  readonly sort: readonly SortSpec[];
  /** Índice de página (0-based). */
  readonly page: number;
  /** Tamaño de página. */
  readonly pageSize: number;
}

/**
 * Respuesta paginada estándar.
 *
 * `results` se tipa como `unknown[]` porque cada entidad define su propio
 * shape de fila. El componente base lo trata como datos opacos; las columnas
 * declaradas en el config saben qué campos leer.
 */
export interface ListResponse {
  readonly results: readonly unknown[];
  readonly totalCount: number;
}
