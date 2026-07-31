import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { SEGURIDAD_SOCIAL_COLUMNS, SEGURIDAD_SOCIAL_FILTERS } from './seguridad-social.constants';

/**
 * Configuración declarativa de **Aporte a seguridad social**
 * (`documento_tipo_id = 22`).
 *
 * Camino A del enfoque híbrido, como los otros dos documentos de humano. En el
 * ERP legacy es el `modelo=703` de `humano/documento/…` — 703 es su
 * `documento_clase_id`, la clase que agrupa a este tipo. Con él se completa la
 * familia: `701` nómina, `702` nómina electrónica, `703` seguridad social.
 *
 * **Documento de solo lectura**: lo emite el proceso de aporte a partir de la
 * planilla del periodo, así que la UI solo ofrece lista y ficha.
 *
 * `new` y `edit` se declaran porque el tipo los exige, pero ninguna capa los usa
 * con `canCreate`/`canEdit` en false.
 */
export const SEGURIDAD_SOCIAL_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'seguridad-social',
  displayNameKey: 'entities.seguridadSocial.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.SEGURIDAD_SOCIAL,
  schemaVersion: 1,
  columns: SEGURIDAD_SOCIAL_COLUMNS,
  filters: SEGURIDAD_SOCIAL_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'seguridad-social/list',
    new: 'seguridad-social/nuevo',
    edit: 'seguridad-social/editar',
    detail: 'seguridad-social/detalle',
  },
  capabilities: {
    canCreate: false,
    canEdit: false,
    canView: true,
    canDelete: false,
    canSelectRows: false,
    canImport: false,
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  extraActionIds: ['export-excel'],
};
