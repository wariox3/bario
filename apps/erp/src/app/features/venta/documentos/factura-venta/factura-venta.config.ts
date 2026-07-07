import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { FACTURA_VENTA_COLUMNS, FACTURA_VENTA_FILTERS } from './factura-venta.constants';

/**
 * Configuración declarativa de **Factura electrónica de venta**.
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `documentTypeId` proviene de `DOCUMENT_TYPE_ID.FACTURA_VENTA` para
 *   evitar magic numbers; el gateway lo inyecta como filtro implícito.
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent`
 *   les prepende `/t/<slug>/venta/` al navegar.
 * - `schemaVersion` incrementa cuando el shape de filtros cambia, para
 *   invalidar la clave de `localStorage` sin afectar al usuario.
 */
export const FACTURA_VENTA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'factura-venta',
  displayNameKey: 'entities.facturaVenta.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.FACTURA_VENTA,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: FACTURA_VENTA_COLUMNS,
  filters: FACTURA_VENTA_FILTERS,
  routes: {
    list: 'factura-venta/list',
    new: 'factura-venta/nuevo',
    edit: 'factura-venta/editar',
    detail: 'factura-venta/detalle',
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
