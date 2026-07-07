import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { NOTA_AJUSTE_COLUMNS, NOTA_AJUSTE_FILTERS } from './nota-ajuste.constants';

/**
 * Configuración declarativa de **Nota ajuste** (backend "NOTA AJUSTE",
 * `documento_tipo_id = 12`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial (mismas líneas que la factura de compra) — `inventoryEffect:'inflow'`
 * es solo metadata. El gateway inyecta `documento_tipo_id` desde este config.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/compra/` al navegar.
 */
export const NOTA_AJUSTE_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-ajuste',
  displayNameKey: 'entities.notaAjuste.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_AJUSTE,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: NOTA_AJUSTE_COLUMNS,
  filters: NOTA_AJUSTE_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nota-ajuste/list',
    new: 'nota-ajuste/nuevo',
    edit: 'nota-ajuste/editar',
    detail: 'nota-ajuste/detalle',
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
