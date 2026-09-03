import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  FACTURA_VENTA_RECURRENTE_COLUMNS,
  FACTURA_VENTA_RECURRENTE_FILTERS,
} from './factura-venta-recurrente.constants';

/**
 * Configuración declarativa de **Factura de venta recurrente** (backend
 * "FACTURA VENTA RECURRENTE", `documento_tipo_id = 16`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. Es una
 * **plantilla** de la familia comercial (mismos campos y líneas que la factura
 * de venta) desde la que se generan facturas reales; `inventoryEffect:'outflow'`
 * es solo metadata. El gateway inyecta `documento_tipo_id` desde este config.
 *
 * Genera facturas de venta reales vía `POST general/documento/generar/`
 * (origen 16 → destino 1) en dos variantes, ambas piden el período:
 * "Generar todos" (botón suelto — todas las plantillas del tipo) y "Generar
 * seleccionados" (dropdown "Acciones" — solo las marcadas). Las dos strategies
 * las comparte con compra.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/venta/` al navegar.
 */
export const FACTURA_VENTA_RECURRENTE_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'factura-venta-recurrente',
  displayNameKey: 'entities.facturaVentaRecurrente.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.FACTURA_VENTA_RECURRENTE,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: FACTURA_VENTA_RECURRENTE_COLUMNS,
  filters: FACTURA_VENTA_RECURRENTE_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'factura-venta-recurrente/list',
    new: 'factura-venta-recurrente/nuevo',
    edit: 'factura-venta-recurrente/editar',
    detail: 'factura-venta-recurrente/detalle',
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
  // Acciones extra del toolbar (cada id ↔ un EntityActionStrategy registrado en
  // ENTITY_ACTION_PROVIDERS; su `placement` decide botón suelto vs dropdown):
  //  - 'generar-recurrente-todos': botón suelto — genera desde todas las
  //    plantillas del tipo (rutina de fin de mes).
  //  - 'generar-recurrente-seleccionados': genera facturas reales desde las
  //    plantillas marcadas.
  //  - 'export-excel': descarga el listado (filtros/orden activos) a Excel.
  extraActionIds: ['generar-recurrente-todos', 'generar-recurrente-seleccionados', 'export-excel'],
};
