import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  FACTURA_COMPRA_RECURRENTE_COLUMNS,
  FACTURA_COMPRA_RECURRENTE_FILTERS,
} from './factura-compra-recurrente.constants';

/**
 * Configuración declarativa de **Factura de compra recurrente** (backend
 * "FACTURA COMPRA RECURRENTE", `documento_tipo_id = 32`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. Es una
 * **plantilla** de la familia comercial (mismas líneas que la factura de compra)
 * desde la que se generan facturas reales; `inventoryEffect:'inflow'` es solo
 * metadata. El gateway inyecta `documento_tipo_id` desde este config.
 *
 * Genera facturas de compra reales vía `POST general/documento/generar/`
 * (origen 32 → destino 5) en dos variantes, ambas piden el período:
 * "Generar todos" (botón suelto — todas las plantillas del tipo) y "Generar
 * seleccionados" (dropdown "Acciones" — solo las marcadas). Las dos strategies
 * las comparte con venta.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/compra/` al navegar.
 */
export const FACTURA_COMPRA_RECURRENTE_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'factura-compra-recurrente',
  displayNameKey: 'entities.facturaCompraRecurrente.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.FACTURA_COMPRA_RECURRENTE,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: FACTURA_COMPRA_RECURRENTE_COLUMNS,
  filters: FACTURA_COMPRA_RECURRENTE_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'factura-compra-recurrente/list',
    new: 'factura-compra-recurrente/nuevo',
    edit: 'factura-compra-recurrente/editar',
    detail: 'factura-compra-recurrente/detalle',
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
  // Ver el docblock de FACTURA_VENTA_RECURRENTE_CONFIG para qué aporta cada id.
  extraActionIds: ['generar-recurrente-todos', 'generar-recurrente-seleccionados', 'export-excel'],
};
