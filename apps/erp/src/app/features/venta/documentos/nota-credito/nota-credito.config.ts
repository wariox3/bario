import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { NOTA_CREDITO_COLUMNS, NOTA_CREDITO_FILTERS } from './nota-credito.constants';

/**
 * Configuración declarativa de **Nota crédito de venta** (`documento_tipo_id = 2`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. De la familia
 * comercial (mismas líneas que la factura de venta); ajusta una factura de venta
 * (`documento_referencia`) y puede cobrarse en el acto (sección de pagos). El
 * form y la ficha los aporta la familia `documentos/_shared/nota/`, compartida
 * con la nota débito.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/venta/` al navegar.
 */
export const NOTA_CREDITO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-credito',
  displayNameKey: 'entities.notaCredito.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_CREDITO_VENTA,
  inventoryEffect: 'inflow',
  schemaVersion: 1,
  columns: NOTA_CREDITO_COLUMNS,
  filters: NOTA_CREDITO_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nota-credito/list',
    new: 'nota-credito/nuevo',
    edit: 'nota-credito/editar',
    detail: 'nota-credito/detalle',
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
