import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';

/**
 * Constantes de la utilidad **Enviar factura electrónica**.
 *
 * Declara, por cada tab (Emitir / Notificar):
 *  - Los **filtros permanentes** (`*_BASE_FILTERS`) que acotan el listado al
 *    estado del ciclo electrónico y al grupo de facturas. Se inyectan como
 *    `baseFilters` de `buildListBody`, antes de los filtros del usuario; nunca
 *    se muestran en la UI.
 *  - Las **columnas** de la tabla.
 *  - Los **campos filtrables** por el usuario (port directo del mapeo legacy).
 *  - La **storage key** de los filtros (persistencia en localStorage).
 */

// ── Prefijo i18n compartido ───────────────────────────────────────────────────
const I18N = 'entities.enviarFacturaElectronica';

/** Grupo de documento que agrupa las facturas (discriminador del backend). */
const GRUPO_FACTURAS = 1;

// ── Filtros permanentes ───────────────────────────────────────────────────────

/**
 * Emitir: facturas aprobadas, aún no enviadas a la DIAN y no descartadas.
 * Espejo de `filtroPermanenteEmitir` del legacy.
 */
export const EMITIR_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'estado_aprobado', operator: 'eq', value: true },
  { field: 'estado_electronico', operator: 'eq', value: false },
  { field: 'estado_electronico_descartado', operator: 'eq', value: false },
  { field: 'documento_tipo__documento_clase__grupo', operator: 'eq', value: GRUPO_FACTURAS },
];

/**
 * Notificar: facturas ya emitidas electrónicamente (aceptadas por la DIAN)
 * pero aún no notificadas al cliente. Espejo de `filtroPermanenteNotificar`.
 */
export const NOTIFICAR_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'estado_electronico', operator: 'eq', value: true },
  { field: 'estado_electronico_notificado', operator: 'eq', value: false },
  { field: 'documento_tipo__documento_clase__grupo', operator: 'eq', value: GRUPO_FACTURAS },
];

// ── Columnas ──────────────────────────────────────────────────────────────────

/** Columnas del tab Emitir: identificación del documento + estado electrónico. */
export const EMITIR_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
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

/** Columnas del tab Notificar: sin badge de estado (todas están ya emitidas). */
export const NOTIFICAR_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
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
];

// ── Campos filtrables por el usuario ──────────────────────────────────────────

/** Filtros del tab Emitir (port directo de `ENVIAR_FACTURA_ELECTRONICA_EMITIR_FILTERS`). */
export const EMITIR_FILTER_FIELDS: readonly FilterField[] = [
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

/** Filtros del tab Notificar (port directo de `ENVIAR_FACTURA_ELECTRONICA_NOTIFICAR_FILTERS`). */
export const NOTIFICAR_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${I18N}.columns.id`, type: 'number' },
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
];

// ── Storage keys de filtros ───────────────────────────────────────────────────

export const EMITIR_FILTERS_STORAGE_KEY = 'venta:enviar-factura-electronica:emitir:filters:v1';
export const NOTIFICAR_FILTERS_STORAGE_KEY =
  'venta:enviar-factura-electronica:notificar:filters:v1';
