import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  NOMINA_ELECTRONICA_COLUMNS,
  NOMINA_ELECTRONICA_FILTERS,
} from './nomina-electronica.constants';

/**
 * Configuración declarativa de **Nómina electrónica** (`documento_tipo_id = 15`).
 *
 * Camino A del enfoque híbrido, igual que la nómina: vive sobre el endpoint
 * genérico `/api/general/documento` discriminado por `documento_tipo_id`. En el
 * ERP legacy es el `modelo=702` de `humano/documento/…` — 702 es su
 * `documento_clase_id`, la clase que agrupa a este tipo.
 *
 * **Documento de solo lectura, pero no inerte**: no se captura a mano (lo
 * fabrica la acción "Generar" del toolbar, que consolida las nóminas de un
 * periodo), y desde la ficha se aprueba, anula y emite a la DIAN.
 *
 * `new` y `edit` se declaran porque el tipo los exige, pero ninguna capa los
 * usa con `canCreate`/`canEdit` en false.
 */
export const NOMINA_ELECTRONICA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nomina-electronica',
  displayNameKey: 'entities.nominaElectronica.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOMINA_ELECTRONICA,
  schemaVersion: 1,
  columns: NOMINA_ELECTRONICA_COLUMNS,
  filters: NOMINA_ELECTRONICA_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nomina-electronica/list',
    new: 'nomina-electronica/nuevo',
    edit: 'nomina-electronica/editar',
    detail: 'nomina-electronica/detalle',
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
  extraActionIds: ['generar-nomina-electronica', 'export-excel'],
};
