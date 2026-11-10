import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas del listado de Saldo inicial, las mismas en Cartera y Tesorería.
 * Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const SALDO_INICIAL_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.saldoInicial.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.saldoInicial.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.saldoInicial.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'entities.saldoInicial.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'entities.saldoInicial.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.saldoInicial.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.saldoInicial.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.saldoInicial.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.saldoInicial.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/** Filtros del usuario; el `documento_tipo_id` lo inyecta el gateway desde el config. */
export const SALDO_INICIAL_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.saldoInicial.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.saldoInicial.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.saldoInicial.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.saldoInicial.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.saldoInicial.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.saldoInicial.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.saldoInicial.filters.contabilizado',
    type: 'boolean',
  },
];
