/**
 * Framework configuracional de módulos del ERP (camino A — ver
 * `docs/architecture/erp-module-architecture.md`).
 *
 * Aplica solo a **documentos transaccionales** sobre el endpoint genérico
 * `/api/documento`. Los masters administrativos viven como features
 * directos en `apps/erp/src/app/features/<modulo>/` y NO usan este módulo.
 *
 * Aquí viven:
 *  - Tipos: `DocumentEntityConfig`, `ModuleConfig`, etc.
 *  - Registry: token `MODULE_REGISTRY` + service `ModuleRegistryService`.
 *  - Estado: `ModuleNavigationStore` (signals del módulo/documento activos).
 *  - Resolvers: `activeModuleResolver`, `activeDocumentResolver`.
 *  - Acceso a datos: `EntityDataGateway` + `HttpEntityDataGateway`.
 *  - Componente base: `BaseDocumentListComponent`.
 *  - Errores tipados del dominio.
 *
 * Los building blocks genéricos (tabla tonta, tipos de columna, query
 * serialization, filter storage) viven en `@reddoc/core` porque son
 * agnósticos del ERP.
 */

// Types
export type {
  EntityConfig,
  EntityKind,
  EntityRoutes,
  DocumentEntityConfig,
  DocumentCapabilities,
  EditableRowContext,
  InventoryEffect,
  ImportDescriptor,
} from '@reddoc/core';
export type { ModuleConfig } from '@reddoc/core';

// Registry
export { MODULE_REGISTRY } from './module-registry.token';
export type { ModuleConfigLoader, ModuleRegistry } from './module-registry.token';
export { ERP_MODULE_REGISTRY } from './module-registry.constant';
export type { ErpModuleId } from './module-registry.constant';
export { ModuleRegistryService } from './module-registry.service';

// Navigation store
export { ModuleNavigationStore } from './module-navigation.store';

// Resolvers
export { activeModuleResolver } from './resolvers/active-module.resolver';
export {
  activeDocumentResolver,
  DOCUMENT_KEY_ROUTE_PARAM,
} from './resolvers/active-document.resolver';
export { editableDocumentResolver } from './resolvers/editable-document.resolver';

// Data gateway
export { ENTITY_DATA_GATEWAY } from '@reddoc/core';
export type { EntityDataGateway } from '@reddoc/core';
export { HttpEntityDataGateway } from '@reddoc/core';
export { DocumentoDetalleService } from '@reddoc/core';

// Importar desde documento (servicio + tipos; el modal NO se exporta para no
// arrastrar PrimeNG al bundle inicial — se carga vía loadComponent).
export { ImportarDocumentoService } from './importar-documento/importar-documento.service';
export type { PendientesPage } from './importar-documento/importar-documento.service';
export type {
  LineaPendienteApi,
  LineaPendienteImpuesto,
  ImportarDocumentoModalData,
} from './importar-documento/importar-documento.types';

// Agregar documento (cruce de cartera: servicio + tipos; el modal NO se exporta
// para no arrastrar PrimeNG al bundle inicial — se carga vía import() dinámico).
export { AgregarDocumentoService } from './agregar-documento/agregar-documento.service';
export type { DocumentosPendientesPage } from './agregar-documento/agregar-documento.service';
export type {
  CarteraTipo,
  DocumentoPendienteApi,
  AgregarDocumentoModalData,
} from './agregar-documento/agregar-documento.types';

// Acciones extra (Strategy + registro)
// NOTA: se exportan SOLO el contrato, el token y los providers. Los strategies
// y sus modales NO se exportan desde aquí para no arrastrar PrimeNG (datepicker,
// dynamicdialog) al bundle inicial — igual que `BaseDocumentListComponent`.
export type { EntityActionStrategy, EntityActionContext } from './actions/entity-action-strategy';
export { ENTITY_ACTION_STRATEGY } from './actions/entity-action.token';
export { ENTITY_ACTION_PROVIDERS } from './actions/entity-action.providers';

// Storage helper
export { buildEntityStorageKey } from './storage/build-entity-storage-key';

// Constants del dominio
export { DOCUMENT_TYPE_ID } from '@reddoc/core';
export type { DocumentTypeId, DocumentTypeKey } from '@reddoc/core';

// Components
// NOTA: BaseDocumentListComponent NO se exporta desde aquí para evitar que
// PrimeNG entre en el bundle inicial. Los consumidores deben usar:
//   loadComponent: () => import('@erp/core/module-config/components/base-document-list/base-document-list.component')
//     .then(m => m.BaseDocumentListComponent)

// Errors
export {
  UnknownModuleError,
  ConfigMismatchError,
  DuplicateDocumentIdError,
  MissingModuleContextError,
  MissingDocumentKeyError,
  DocumentNotFoundError,
} from './errors/config.errors';
