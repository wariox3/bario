/**
 * Building blocks de listados/tablas compartidos por toda app del monorepo.
 *
 * Solo contiene piezas **agnósticas del dominio**:
 *  - Tipos de columnas y filtros (`ColumnDef`, `FilterField`).
 *  - Contratos de query y respuesta paginada (`ListQuery`, `ListResponse`).
 *  - Catálogo de operadores de filtro por tipo (`FILTER_OPERATORS`).
 *  - Serialización al body `{filtros, ordenamientos, …}` del backend (`buildListBody`).
 *  - Persistencia de filtros en localStorage (`FilterStorageService`).
 *
 * El framework configuracional específico del ERP (registry de módulos,
 * resolvers, gateway, base-document-list, etc.) vive en
 * `apps/erp/src/app/core/module-config/`, no aquí.
 */

// Types
export type {
  ColumnDef,
  ColumnValueType,
  ColumnAlignment,
  ColumnPart,
  ColumnPartType,
} from './types/column-def.types';
export type { FilterField, FilterFieldType } from './types/filter-field.types';
export type {
  FilterCondition,
  FilterOperator,
  ListQuery,
  ListResponse,
  SortDirection,
  SortSpec,
} from './data/list-query.types';

// Operadores de filtro (catálogo declarativo por tipo de campo)
export { FILTER_OPERATORS, getOperatorsForType, getOperatorDef } from './filters/filter-operators';
export type { FilterOperatorDef, FilterValueKind } from './filters/filter-operators';
export { quickSearchCondition } from './filters/quick-search';

// Query serialization
export { serializeListQuery } from './data/serialize-list-query';
export {
  BACKEND_OPERATOR,
  LIST_PAGINATION_PARAMS,
  buildFiltros,
  buildOrdenamientos,
  buildListBody,
  buildListParams,
} from './data/build-list-body';
export type { AdvancedListBody, BackendFilter } from './data/build-list-body';

// Storage
export { FilterStorageService } from './storage/filter-storage.service';
