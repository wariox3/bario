import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';
import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@reddoc/core';

export const PROGRAMACIONES_FILTERS_STORAGE_KEY = 'programaciones:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo.
 */
export const PROGRAMACIONES_QUICK_SEARCH_FIELD = 'numero';

/** Segmentos de ruta del listado, relativos al tenant. */
export const PROGRAMACION_LIST_PATH = ['programaciones'] as const;

/**
 * Columnas visibles del listado.
 *
 * La programación muestra documentos de pedido servicio (tipo 35) recortados a
 * los campos que pidió negocio: id, número, fecha, identificación, contacto y
 * las horas (H/HD/HN). Los `field` mapean el read-model de
 * `general/documento/lista/`.
 */
export const PROGRAMACIONES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.programacion.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.programacion.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.programacion.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.programacion.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.programacion.columns.contacto',
    type: 'text',
  },
  {
    field: 'horas',
    headerKey: 'entities.programacion.columns.horas',
    type: 'combined',
    parts: [
      { field: 'horas', type: 'number' },
      { field: 'horas_programadas', type: 'number' },
    ],
    width: '110px',
    align: 'right',
  },
  {
    field: 'horas_diurnas',
    headerKey: 'entities.programacion.columns.horasDiurnas',
    type: 'combined',
    parts: [
      { field: 'horas_diurnas', type: 'number' },
      { field: 'horas_diurnas_programadas', type: 'number' },
    ],
    width: '110px',
    align: 'right',
  },
  {
    field: 'horas_nocturnas',
    headerKey: 'entities.programacion.columns.horasNocturnas',
    type: 'combined',
    parts: [
      { field: 'horas_nocturnas', type: 'number' },
      { field: 'horas_nocturnas_programadas', type: 'number' },
    ],
    width: '110px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 * El filtro implícito `documento_tipo_id` lo inyecta el gateway desde
 * `PROGRAMACION_DOCUMENT_CONFIG.documentTypeId`; acá solo van los del usuario.
 * Los nombres siguen la convención de relaciones del backend de documentos
 * (`contacto__numero_identificacion`).
 */
export const PROGRAMACIONES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.programacion.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.programacion.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.programacion.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.programacion.columns.contacto',
    type: 'string',
  },
];

export const PROGRAMACIONES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

/**
 * Config de documento que conduce al `ENTITY_DATA_GATEWAY` (camino A) desde el
 * shell propio de este movimiento (camino B).
 *
 * El gateway solo lee `endpoint`, `documentTypeId`, `defaultSort` y
 * `defaultFilters`: con eso pega a `general/documento/lista/` inyectando el
 * filtro implícito `documento_tipo_id = 35` (pedido servicio) y resuelve también
 * el batch-delete por `endpoint`. La presentación (columnas, acciones) la maneja
 * el shell con las constantes de arriba; las demás propiedades del config se
 * llenan para satisfacer el tipo `DocumentEntityConfig`.
 */
export const PROGRAMACION_DOCUMENT_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'programacion',
  displayNameKey: 'entities.programacion.name',
  endpoint: '/api/general/documento',
  documentTypeId: DOCUMENT_TYPE_ID.PEDIDO_SERVICIO,
  inventoryEffect: 'outflow',
  schemaVersion: 1,
  columns: PROGRAMACIONES_COLUMNS,
  filters: PROGRAMACIONES_FILTER_FIELDS,
  defaultSort: [{ field: 'id', direction: 'desc' }],
  routes: {
    list: 'programaciones',
    new: 'programaciones',
    edit: 'programaciones',
    detail: 'programaciones/detalle',
  },
  capabilities: {
    canCreate: false,
    canEdit: false,
    canView: true,
    canDelete: true,
    canSelectRows: true,
    canImport: false,
    canExportExcel: false,
    canExportZip: false,
    canGenerate: false,
  },
};
