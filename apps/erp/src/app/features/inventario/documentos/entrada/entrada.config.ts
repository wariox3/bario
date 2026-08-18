import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { ENTRADA_COLUMNS, ENTRADA_FILTERS } from './entrada.constants';

/**
 * Configuración declarativa de **Entrada de almacén** (backend "ENTRADA",
 * `documento_tipo_id = 9`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. Es el primer
 * documento de la familia **inventario**: mueve stock (`inventoryEffect:'inflow'`)
 * y sus líneas no llevan impuestos ni descuento, sino ítem + almacén + costo.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/inventario/` al navegar.
 */
export const ENTRADA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'entrada',
  displayNameKey: 'entities.entrada.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.ENTRADA_ALMACEN,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: ENTRADA_COLUMNS,
  filters: ENTRADA_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'entrada/list',
    new: 'entrada/nuevo',
    edit: 'entrada/editar',
    detail: 'entrada/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    // La importación de líneas por Excel del legacy queda fuera de esta versión.
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  // Una entrada aprobada ya movió stock: no se edita. Regla única consumida por
  // la lista, el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  extraActionIds: ['export-excel'],
};
