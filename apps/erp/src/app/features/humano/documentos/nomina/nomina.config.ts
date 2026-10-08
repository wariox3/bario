import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import { NOMINA_COLUMNS, NOMINA_FILTERS } from './nomina.constants';

/**
 * Configuración declarativa de **Nómina** (`documento_tipo_id = 14`).
 *
 * Camino A del enfoque híbrido: vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo_id`. En el ERP
 * legacy es el `modelo=701` de `humano/documento/…` — 701 es una clave interna
 * suya, no el id del backend, que es el 14 que ya declara `DOCUMENT_TYPE_ID`.
 *
 * **Documento de solo lectura**: no se crea ni se edita a mano. Cada nómina la
 * emite el proceso de liquidación a partir de la programación del periodo, así
 * que la UI solo ofrece lista y ficha (igual que el legacy, que para este
 * documento tampoco expone formulario propio).
 *
 * `routes` son relativas al módulo; el `BaseDocumentListComponent` les prepende
 * `/t/<slug>/humano/` al navegar. `new` y `edit` se declaran porque el tipo los
 * exige, pero ninguna capa los usa con `canCreate`/`canEdit` en false.
 */
export const NOMINA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nomina',
  displayNameKey: 'entities.nomina.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.NOMINA,
  schemaVersion: 1,
  columns: NOMINA_COLUMNS,
  filters: NOMINA_FILTERS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'nomina/list',
    new: 'nomina/nuevo',
    edit: 'nomina/editar',
    detail: 'nomina/detalle',
  },
  capabilities: {
    canCreate: false,
    canEdit: false,
    canView: true,
    canDelete: false,
    canSelectRows: false,
    canExportExcel: true,
    canExportZip: false,
    canGenerate: false,
  },
  extraActionIds: ['export-excel'],
};
