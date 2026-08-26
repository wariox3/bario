import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { ASIENTO_COLUMNS, ASIENTO_FILTERS } from './asiento.constants';

/**
 * Configuración declarativa de **Asiento contable** (backend "ASIENTO",
 * `documento_tipo_id = 13`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. El gateway
 * inyecta el `documento_tipo_id` desde este config.
 *
 * Es el **comprobante contable manual**: el usuario imputa a mano las cuentas del
 * PUC con su naturaleza (débito/crédito). No es de la familia comercial —sus
 * líneas son asientos, sin ítems ni impuestos—, por eso no declara
 * `inventoryEffect`. Es el primer documento del módulo contabilidad.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/contabilidad/` al navegar.
 *
 * El orden por defecto espeja al del resto de documentos: los pendientes por
 * aprobar primero, y dentro de cada grupo lo más reciente arriba.
 */
export const ASIENTO_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'asiento',
  displayNameKey: 'entities.asiento.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.ASIENTO,
  schemaVersion: 1,
  columns: ASIENTO_COLUMNS,
  filters: ASIENTO_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'asiento/list',
    new: 'asiento/nuevo',
    edit: 'asiento/editar',
    detail: 'asiento/detalle',
  },
  capabilities: {
    canCreate: true,
    canEdit: true,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    // El legacy importa líneas desde Excel (`importar-detalle-cuenta/`), pero esa
    // maquinaria todavía no existe en este ERP. Ver PENDIENTES.md.
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  // Un asiento aprobado ya movió los saldos: no se edita. Regla única consumida
  // por la lista, el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  extraActionIds: ['export-excel'],
};
