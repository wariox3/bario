import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';

/**
 * Constantes de la utilidad **Enviar factura electrónica** (Venta). Alimentan
 * `ENVIAR_FACTURA_ELECTRONICA_CONFIG`: filtros permanentes, columnas propias,
 * campos filtrables por el usuario y la storage key de los filtros.
 */

const I18N = 'entities.enviarFacturaElectronica';

/** Grupo de documento que agrupa las facturas (discriminador del backend). */
const GRUPO_FACTURAS = 1;

/**
 * Facturas aprobadas, aún no enviadas a la DIAN y no descartadas. Espejo de
 * `filtroPermanenteEmitir` del legacy. Se inyectan como `baseFilters` de
 * `buildListBody`, antes de los filtros del usuario; nunca se muestran en la UI.
 */
export const BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'estado_aprobado', operator: 'eq', value: true },
  { field: 'estado_electronico', operator: 'eq', value: false },
  { field: 'estado_electronico_descartado', operator: 'eq', value: false },
  { field: 'documento_tipo__documento_clase__grupo', operator: 'eq', value: GRUPO_FACTURAS },
];

/** Columnas propias del listado. La de Estado la agrega `EmitirDocumentoElectronicoComponent`. */
export const COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '70px', align: 'right' },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  {
    field: 'resolucion_etiqueta',
    headerKey: `${I18N}.columns.resolucion`,
    type: 'text',
    width: '160px',
  },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  { field: 'contacto_nombre_corto', headerKey: `${I18N}.columns.cliente`, type: 'text' },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];

/** Filtros del usuario (port directo de `ENVIAR_FACTURA_ELECTRONICA_EMITIR_FILTERS`). */
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

/** Clave heredada del tab Emitir: se conserva para no perder los filtros guardados. */
export const FILTERS_STORAGE_KEY = 'venta:enviar-factura-electronica:emitir:filters:v1';
