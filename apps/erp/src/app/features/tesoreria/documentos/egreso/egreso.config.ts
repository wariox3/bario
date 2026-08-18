import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { EGRESO_COLUMNS, EGRESO_FILTERS } from './egreso.constants';

/**
 * Configuración declarativa de **Egreso** (backend "EGRESO", `documento_tipo_id = 8`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. El gateway
 * inyecta el `documento_tipo_id` desde este config.
 *
 * Es el **desembolso de tesorería**, espejo del pago de cartera: aplica la plata
 * que sale de una cuenta bancaria contra las cuentas por pagar pendientes del
 * proveedor. No es de la familia comercial — sus líneas son movimientos
 * contables (cuenta + naturaleza D/C), sin ítems ni impuestos, por eso no
 * declara `inventoryEffect`.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/tesoreria/` al navegar.
 *
 * El orden por defecto espeja el del legacy (`estado_aprobado,-fecha,-numero,-id`):
 * los pendientes por aprobar primero, y dentro de cada grupo lo más reciente arriba.
 */
export const EGRESO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'egreso',
  displayNameKey: 'entities.egreso.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.EGRESO,
  schemaVersion: 1,
  columns: EGRESO_COLUMNS,
  filters: EGRESO_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'egreso/list',
    new: 'egreso/nuevo',
    edit: 'egreso/editar',
    detail: 'egreso/detalle',
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
