export type {
  DocumentoListRowBase,
  DocumentoEstados,
  DocumentoReadBase,
  DocumentoPayloadBase,
  DocumentoDetalleReadBase,
  DocumentoDetallePayloadBase,
  DocumentoDetalleImpuestoRead,
} from './documento.types';
export type {
  EntityKind,
  InventoryEffect,
  DocumentCapabilities,
  EditableRowContext,
  EntityRoutes,
  DocumentEntityConfig,
  EntityConfig,
} from './entity-config.types';
export type { ModuleConfig } from './module-config.types';
export { DOCUMENT_TYPE_ID } from './document-types.constants';
export type { DocumentTypeId, DocumentTypeKey } from './document-types.constants';
export { ENTITY_DATA_GATEWAY } from './entity-data-gateway';
export type { EntityDataGateway } from './entity-data-gateway';
export { HttpEntityDataGateway } from './http-entity-data-gateway.service';
export { documentoContactoToOption } from './documento-contacto';
export type { DocumentoContactoRead } from './documento-contacto';
export { DocumentoDetalleService } from './documento-detalle.service';
