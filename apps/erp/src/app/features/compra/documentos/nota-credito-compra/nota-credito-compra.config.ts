import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  NOTA_CREDITO_COMPRA_COLUMNS,
  NOTA_CREDITO_COMPRA_FILTERS,
} from './nota-credito-compra.constants';

/**
 * Configuración declarativa de **Nota crédito de compra** (backend
 * "NOTA CREDITO COMPRA", `documento_tipo_id = 6`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial (mismas líneas que la factura de compra) — `inventoryEffect:'outflow'`
 * es solo metadata: la nota crédito de compra reversa mercancía ingresada. El
 * gateway inyecta `documento_tipo_id` desde este config.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/compra/` al navegar.
 */
export const NOTA_CREDITO_COMPRA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-credito-compra',
  displayNameKey: 'entities.notaCreditoCompra.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_CREDITO_COMPRA,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: NOTA_CREDITO_COMPRA_COLUMNS,
  filters: NOTA_CREDITO_COMPRA_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nota-credito-compra/list',
    new: 'nota-credito-compra/nuevo',
    edit: 'nota-credito-compra/editar',
    detail: 'nota-credito-compra/detalle',
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
  extraActionIds: ['export-excel'],
};
