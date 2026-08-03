import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { CIERRE_COLUMNS, CIERRE_FILTERS } from './cierre.constants';

/**
 * Configuración declarativa de **Cierre contable** (backend "CIERRE_CONTABLE",
 * `documento_tipo_id = 25`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`.
 *
 * Cierra el ejercicio: traslada los saldos de las cuentas de resultado a la
 * cuenta de cierre, y por eso su fecha es siempre un 31 de diciembre. Como la
 * depreciación, sus líneas las genera el backend (`cargar-cierre/`) y no se
 * teclean; a diferencia de ella, son asientos contables normales, así que reusa
 * la tabla de la familia contable.
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/contabilidad/` al navegar.
 */
export const CIERRE_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'cierre',
  displayNameKey: 'entities.cierre.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.CIERRE_CONTABLE,
  schemaVersion: 1,
  columns: CIERRE_COLUMNS,
  filters: CIERRE_FILTERS,
  defaultSort: [
    { field: 'estado_aprobado', direction: 'asc' },
    { field: 'fecha', direction: 'desc' },
    { field: 'numero', direction: 'desc' },
    { field: 'id', direction: 'desc' },
  ],
  routes: {
    list: 'cierre/list',
    new: 'cierre/nuevo',
    edit: 'cierre/editar',
    detail: 'cierre/detalle',
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
  // Un cierre aprobado ya movió los saldos del ejercicio: no se edita.
  canEditRow: (row) => !row.estado_aprobado,
  extraActionIds: ['export-excel'],
};
