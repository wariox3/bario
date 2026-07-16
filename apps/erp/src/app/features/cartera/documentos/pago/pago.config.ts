import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { PAGO_COLUMNS, PAGO_FILTERS } from './pago.constants';

/**
 * Configuración declarativa de **Pago** (backend "PAGO", `documento_tipo_id = 4`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. El gateway
 * inyecta el `documento_tipo_id` desde este config.
 *
 * Es el **recaudo de cartera**: aplica la plata que entra a una cuenta bancaria
 * contra las cuentas por cobrar pendientes del cliente. No es de la familia
 * comercial — sus líneas son movimientos contables (cuenta + naturaleza D/C),
 * sin ítems ni impuestos, por eso no declara `inventoryEffect`.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/cartera/` al navegar.
 *
 * El orden por defecto espeja el del legacy (`estado_aprobado,-fecha,-numero,-id`):
 * los pendientes por aprobar primero, y dentro de cada grupo lo más reciente arriba.
 */
export const PAGO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'pago',
  displayNameKey: 'entities.pago.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.PAGO,
  schemaVersion: 1,
  columns: PAGO_COLUMNS,
  filters: PAGO_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'pago/list',
    new: 'pago/nuevo',
    edit: 'pago/editar',
    detail: 'pago/detalle',
  },
  capabilities: {
    // Solo el listado por ahora: `canCreate`/`canEdit`/`canView` se encienden
    // cuando existan el form y el detalle (sus rutas todavía no están).
    canCreate: false,
    canEdit: false,
    canView: false,
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
