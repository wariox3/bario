import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas visibles del listado de Pago.
 *
 * El pago es un **recaudo de cartera**, no un documento comercial: no tiene
 * subtotal ni impuestos (sus líneas son movimientos contables), así que el set
 * se queda en identificación del documento, cliente, total recaudado y estados.
 * Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const PAGO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.pago.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.pago.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.pago.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.pago.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.pago.columns.cliente',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.pago.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.pago.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.pago.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.pago.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 *
 * Espeja los filtros genéricos de documento del legacy (`DOCUMENTO_FILTERS`).
 */
export const PAGO_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.pago.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.pago.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.pago.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.pago.columns.cliente',
    type: 'string',
  },
  { name: 'estado_aprobado', displayNameKey: 'entities.pago.filters.aprobado', type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: 'entities.pago.filters.anulado', type: 'boolean' },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.pago.filters.contabilizado',
    type: 'boolean',
  },
];
