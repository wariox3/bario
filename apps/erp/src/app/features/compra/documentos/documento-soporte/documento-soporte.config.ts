import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  DOCUMENTO_SOPORTE_COLUMNS,
  DOCUMENTO_SOPORTE_FILTERS,
} from './documento-soporte.constants';

/**
 * Configuración declarativa de **Documento soporte** (backend "DOCUMENTO
 * SOPORTE", `documento_tipo_id = 11`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial (mismas líneas que la factura de compra) — `inventoryEffect:'inflow'`
 * (ingresa mercancía). El gateway inyecta `documento_tipo_id` desde este config.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/compra/` al navegar.
 */
export const DOCUMENTO_SOPORTE_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'documento-soporte',
  displayNameKey: 'entities.documentoSoporte.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.DOCUMENTO_SOPORTE,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: DOCUMENTO_SOPORTE_COLUMNS,
  filters: DOCUMENTO_SOPORTE_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'documento-soporte/list',
    new: 'documento-soporte/nuevo',
    edit: 'documento-soporte/editar',
    detail: 'documento-soporte/detalle',
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
