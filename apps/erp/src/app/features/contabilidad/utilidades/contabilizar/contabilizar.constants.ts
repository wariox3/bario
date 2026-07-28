import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';

const I18N = 'entities.contabilizar';

export const CONTABILIZAR_FILTERS_STORAGE_KEY = 'contabilidad:contabilizar:filters:v1';

/**
 * Documentos **pendientes de contabilizar**: aprobados, todavía sin
 * contabilizar y de un tipo que va a contabilidad. Espejo de los filtros
 * permanentes del ERP anterior.
 *
 * Se inyectan como `baseFilters` de `buildListBody`, antes de los del usuario;
 * nunca se muestran en la UI.
 */
export const BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'estado_contabilizado', operator: 'eq', value: false },
  { field: 'estado_aprobado', operator: 'eq', value: true },
  { field: 'documento_tipo__contabilidad', operator: 'eq', value: true },
];

/** Columnas del listado: identificación del documento, tercero y desglose fiscal. */
export const COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
  {
    field: 'documento_tipo_nombre',
    headerKey: `${I18N}.columns.documentoTipo`,
    type: 'text',
    width: '170px',
  },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  { field: 'contacto_nombre', headerKey: `${I18N}.columns.contacto`, type: 'text' },
  {
    field: 'subtotal',
    headerKey: `${I18N}.columns.subtotal`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: `${I18N}.columns.impuesto`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];

/** Filtros del usuario (port de `CONTABILIZAR_FILTERS`). */
export const FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
  {
    name: 'documento_tipo__nombre',
    displayNameKey: `${I18N}.columns.documentoTipo`,
    type: 'string',
  },
];

/**
 * Tope de documentos que trae la búsqueda de descontabilización, igual que el
 * ERP anterior. Si el rango abarca más, los sobrantes **no** se procesan — la
 * página avisa cuando eso pasa (allá era silencioso).
 */
export const DESCONTABILIZAR_LIMITE = 1000;
