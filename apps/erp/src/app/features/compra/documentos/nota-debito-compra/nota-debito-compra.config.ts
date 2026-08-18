import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  NOTA_DEBITO_COMPRA_COLUMNS,
  NOTA_DEBITO_COMPRA_FILTERS,
} from './nota-debito-compra.constants';

/**
 * Configuración declarativa de **Nota débito de compra** (backend
 * "NOTA DEBITO COMPRA", `documento_tipo_id = 7`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial (mismas líneas que la factura de compra) — `inventoryEffect:'inflow'`
 * es solo metadata: la nota débito de compra incrementa el valor de la compra. El
 * gateway inyecta `documento_tipo_id` desde este config.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/compra/` al navegar.
 */
export const NOTA_DEBITO_COMPRA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-debito-compra',
  displayNameKey: 'entities.notaDebitoCompra.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_DEBITO_COMPRA,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: NOTA_DEBITO_COMPRA_COLUMNS,
  filters: NOTA_DEBITO_COMPRA_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nota-debito-compra/list',
    new: 'nota-debito-compra/nuevo',
    edit: 'nota-debito-compra/editar',
    detail: 'nota-debito-compra/detalle',
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
  extraActionIds: ['export-excel'],
};
