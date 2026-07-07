import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { PEDIDO_SERVICIO_COLUMNS, PEDIDO_SERVICIO_FILTERS } from './pedido-servicio.constants';

/**
 * Configuración declarativa de **Pedido servicio** (movimiento de venta).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. Pertenece a la
 * misma familia que Contrato servicio: comparte el form, la tabla de detalles y
 * el tarifador de supervigilancia (`ServicioDocumentoFormComponent`), que se
 * parametriza con esta config.
 *
 * - `documentTypeId` proviene de `DOCUMENT_TYPE_ID.PEDIDO_SERVICIO` (id 35)
 *   para evitar magic numbers; el gateway lo inyecta como filtro implícito.
 * - `inventoryEffect` es metadata para forms/inventario; la lista no la usa.
 */
export const PEDIDO_SERVICIO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'pedido-servicio',
  displayNameKey: 'entities.pedidoServicio.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.PEDIDO_SERVICIO,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: PEDIDO_SERVICIO_COLUMNS,
  filters: PEDIDO_SERVICIO_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'pedido-servicio/list',
    new: 'pedido-servicio/nuevo',
    edit: 'pedido-servicio/editar',
    detail: 'pedido-servicio/detalle',
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
