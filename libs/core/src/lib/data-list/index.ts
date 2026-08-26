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
 * El núcleo compartido del framework configuracional de documentos (tipos
 * `DocumentEntityConfig`/`ModuleConfig`, gateway `ENTITY_DATA_GATEWAY` +
 * `HttpEntityDataGateway`, `DocumentoDetalleService`) vive al lado, en
 * `libs/core/documento`. Lo específico del ERP (registry de módulos, resolvers,
 * `BaseDocumentListComponent`) queda en `apps/erp/src/app/core/module-config/`.
 */

// Types
export type {
  BooleanTone,
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
export { applyClientFilters, matchesCondition } from './filters/match-conditions';

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
