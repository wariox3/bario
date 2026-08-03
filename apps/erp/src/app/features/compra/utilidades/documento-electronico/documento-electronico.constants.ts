import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';

/**
 * Constantes de la utilidad **Documento electrónico** (Compra).
 *
 * Declara:
 *  - Los **filtros permanentes** (`BASE_FILTERS`) que acotan el listado a los
 *    documentos electrónicos de compra aprobados y pendientes de emitir. Se
 *    inyectan como `baseFilters` de `buildListBody`, antes de los del usuario;
 *    nunca se muestran en la UI.
 *  - Las **columnas** de la tabla (incluye `documento_tipo_nombre`, propio de
 *    compra por agrupar varios tipos electrónicos).
 *  - Los **campos filtrables** por el usuario (port del mapeo legacy).
 *  - La **storage key** de los filtros.
 */

const I18N = 'entities.documentoElectronico';

/** Grupo de documento electrónico de compra (discriminador del backend). */
const GRUPO_COMPRA_ELECTRONICO = 3;

/**
 * Documentos electrónicos de compra, aprobados, aún no enviados a la DIAN y no
 * descartados. Espejo de `filtroPermanenteEmitir` del legacy.
 */
export const BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'estado_aprobado', operator: 'eq', value: true },
  { field: 'estado_electronico', operator: 'eq', value: false },
  { field: 'estado_electronico_descartado', operator: 'eq', value: false },
  { field: 'documento_tipo__electronico', operator: 'eq', value: true },
  {
    field: 'documento_tipo__documento_clase__grupo',
    operator: 'eq',
    value: GRUPO_COMPRA_ELECTRONICO,
  },
];

/** Columnas del listado: identificación del documento + tipo + estado electrónico. */
export const COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
  {
    field: 'documento_tipo_nombre',
    headerKey: `${I18N}.columns.documentoTipo`,
    type: 'text',
    width: '160px',
  },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  { field: 'contacto_nombre', headerKey: `${I18N}.columns.cliente`, type: 'text' },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_electronico_estado',
    headerKey: `${I18N}.columns.estado`,
    type: 'enum',
    width: '160px',
    align: 'center',
    enumKeyPrefix: `${I18N}.estado`,
  },
];

/** Filtros del usuario (port de `DOCUMENTO_ELECTRONICO_FILTERS`). */
export const FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
  {
    name: 'estado_electronico_notificado',
    displayNameKey: `${I18N}.filters.notificado`,
    type: 'boolean',
  },
  {
    name: 'estado_electronico_enviado',
    displayNameKey: `${I18N}.filters.enviado`,
    type: 'boolean',
  },
];

export const FILTERS_STORAGE_KEY = 'compra:documento-electronico:filters:v1';
