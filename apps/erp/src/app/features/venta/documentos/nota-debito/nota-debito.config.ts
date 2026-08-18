import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { NOTA_DEBITO_COLUMNS, NOTA_DEBITO_FILTERS } from './nota-debito.constants';

/**
 * Configuración declarativa de **Nota débito de venta** (`documento_tipo_id = 3`).
 *
 * Gemela de la nota crédito de venta (camino A): vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial; ajusta una factura de venta (`documento_referencia`) y puede
 * cobrarse en el acto (sección de pagos). El form y la ficha los aporta la
 * familia `documentos/_shared/nota/`, compartida con la nota crédito.
 *
 * `inventoryEffect: 'inflow'` es solo metadata (espeja la nota crédito). `routes`
 * son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/venta/` al navegar.
 */
export const NOTA_DEBITO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-debito',
  displayNameKey: 'entities.notaDebito.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_DEBITO_VENTA,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: NOTA_DEBITO_COLUMNS,
  filters: NOTA_DEBITO_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nota-debito/list',
    new: 'nota-debito/nuevo',
    edit: 'nota-debito/editar',
    detail: 'nota-debito/detalle',
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
