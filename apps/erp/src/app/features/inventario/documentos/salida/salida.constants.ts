import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas visibles del listado de Salida de almacén.
 *
 * Subconjunto de `DocumentoListRowBase`: un movimiento de almacén no tiene
 * desglose fiscal (ni subtotal ni impuesto), así que la valorización se muestra
 * en una sola columna `total`. Los `field` mapean el shape del endpoint
 * `general/documento/lista/`.
 */
export const SALIDA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.salida.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.salida.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.salida.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.salida.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.salida.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.salida.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.salida.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.salida.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.salida.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const SALIDA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.salida.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.salida.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.salida.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.salida.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.salida.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.salida.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.salida.filters.contabilizado',
    type: 'boolean',
  },
];
