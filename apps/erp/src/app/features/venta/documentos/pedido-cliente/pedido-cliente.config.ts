import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { PEDIDO_CLIENTE_COLUMNS, PEDIDO_CLIENTE_FILTERS } from './pedido-cliente.constants';

/**
 * Configuración declarativa de **Pedido de cliente**.
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`
 * (`DOCUMENT_TYPE_ID.PEDIDO_CLIENTE` = 26). El pedido es un documento comercial
 * previo a la factura. `inventoryEffect` es metadata para forms/inventario (la
 * lista no la usa); `'outflow'` por coherencia con el resto de venta.
 *
 * - `endpoint` no incluye el sufijo de operación (`/lista/`, `/eliminar/`):
 *   el `HttpEntityDataGateway` lo añade según corresponda.
 * - `routes` son **relativas al módulo**; el `BaseDocumentListComponent`
 *   les prepende `/t/<slug>/venta/` al navegar.
 */
export const PEDIDO_CLIENTE_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'pedido-cliente',
  displayNameKey: 'entities.pedidoCliente.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.PEDIDO_CLIENTE,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: PEDIDO_CLIENTE_COLUMNS,
  filters: PEDIDO_CLIENTE_FILTERS,
  routes: {
    list: 'pedido-cliente/list',
    new: 'pedido-cliente/nuevo',
    edit: 'pedido-cliente/editar',
    detail: 'pedido-cliente/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
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
