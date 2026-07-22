import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { REMISION_COLUMNS, REMISION_FILTERS } from './remision.constants';

/**
 * Configuración declarativa de **Remisión**.
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`
 * (`DOCUMENT_TYPE_ID.REMISION` = 29). La remisión es una entrega física de
 * mercancía: mueve inventario (`inventoryEffect: 'outflow'`).
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent`
 *   les prepende `/t/<slug>/venta/` al navegar.
 */
export const REMISION_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'remision',
  displayNameKey: 'entities.remision.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.REMISION,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: REMISION_COLUMNS,
  filters: REMISION_FILTERS,
  routes: {
    list: 'remision/list',
    new: 'remision/nuevo',
    edit: 'remision/editar',
    detail: 'remision/detalle',
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
  // Acciones extra del dropdown "Acciones":
  //  - 'export-excel': descarga el listado (filtros/orden activos) a Excel.
  extraActionIds: ['export-excel'],
};
