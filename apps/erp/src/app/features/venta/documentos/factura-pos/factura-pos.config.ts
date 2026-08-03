import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { FACTURA_POS_COLUMNS, FACTURA_POS_FILTERS } from './factura-pos.constants';

/**
 * Configuración declarativa de **Factura POS** (punto de venta).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `documentTypeId` proviene de `DOCUMENT_TYPE_ID.FACTURA_POS` para
 *   evitar magic numbers; el gateway lo inyecta como filtro implícito.
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent`
 *   les prepende `/t/<slug>/venta/` al navegar.
 * - `schemaVersion` incrementa cuando el shape de filtros cambia, para
 *   invalidar la clave de `localStorage` sin afectar al usuario.
 */
export const FACTURA_POS_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'factura-pos',
  displayNameKey: 'entities.facturaPos.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.FACTURA_POS,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: FACTURA_POS_COLUMNS,
  filters: FACTURA_POS_FILTERS,
  routes: {
    list: 'factura-pos/list',
    new: 'factura-pos/nuevo',
    edit: 'factura-pos/editar',
    detail: 'factura-pos/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    canImport: false,
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  // Un documento aprobado ya no se edita. Regla única consumida por la lista,
  // el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  // Acciones extra del dropdown "Acciones" (cada id ↔ un EntityActionStrategy
  // registrado en ENTITY_ACTION_PROVIDERS):
  //  - 'export-excel': descarga el listado (filtros/orden activos) a Excel.
  extraActionIds: ['export-excel'],
};
