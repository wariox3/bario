import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas visibles del listado de Traslado entre almacenes.
 *
 * Subconjunto de `DocumentoListRowBase`: un movimiento de almacén no tiene
 * desglose fiscal (ni subtotal ni impuesto), así que la valorización se muestra
 * en una sola columna `total`. Los `field` mapean el shape del endpoint
 * `general/documento/lista/`.
 */
export const TRASLADO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.traslado.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.traslado.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.traslado.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.traslado.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.traslado.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.traslado.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.traslado.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.traslado.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.traslado.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const TRASLADO_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.traslado.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.traslado.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.traslado.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.traslado.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.traslado.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.traslado.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.traslado.filters.contabilizado',
    type: 'boolean',
  },
];
