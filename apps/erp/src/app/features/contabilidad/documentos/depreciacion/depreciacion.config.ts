import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { DEPRECIACION_COLUMNS, DEPRECIACION_FILTERS } from './depreciacion.constants';

/**
 * Configuración declarativa de **Depreciación** (backend "DEPRECIACION",
 * `documento_tipo_id = 23`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * A diferencia del asiento, **sus líneas no se teclean**: las genera el backend
 * a partir de los activos fijos (`cargar-activo/`), y en el front solo se ven y
 * se eliminan. Por eso tiene tabla propia en vez de la contable compartida.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/contabilidad/` al navegar.
 */
export const DEPRECIACION_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'depreciacion',
  displayNameKey: 'entities.depreciacion.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.DEPRECIACION,
  schemaVersion: 1,
  columns: DEPRECIACION_COLUMNS,
  filters: DEPRECIACION_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'depreciacion/list',
    new: 'depreciacion/nuevo',
    edit: 'depreciacion/editar',
    detail: 'depreciacion/detalle',
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
  // Una depreciación aprobada ya movió los saldos: no se edita. Regla única
  // consumida por la lista, el detalle y el resolver de la ruta de edición.
  canEditRow: (row) => !row.estado_aprobado,
  extraActionIds: ['export-excel'],
};
