import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas visibles del listado de Entrada de almacén.
 *
 * Subconjunto de `DocumentoListRowBase`: un movimiento de almacén no tiene
 * desglose fiscal (ni subtotal ni impuesto), así que la valorización se muestra
 * en una sola columna `total`. Los `field` mapean el shape del endpoint
 * `general/documento/lista/`.
 */
export const ENTRADA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.entrada.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.entrada.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.entrada.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.entrada.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.entrada.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.entrada.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.entrada.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.entrada.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.entrada.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const ENTRADA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.entrada.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.entrada.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.entrada.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.entrada.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.entrada.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.entrada.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.entrada.filters.contabilizado',
    type: 'boolean',
  },
];
