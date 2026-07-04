import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Columnas visibles del listado de Nota ajuste.
 *
 * Mismo set canónico de `DocumentoListRowBase` que la factura de compra (id,
 * número, fecha, identificación del proveedor, desglose de montos y flags de
 * estado). Los `field` mapean el shape del endpoint `general/documento/lista/`.
 *
 * Los endpoints de los selects (plazo/método de pago, centro de costo) NO viven
 * aquí: se toman de `@erp/core/data/select-endpoints` para no repetirlos.
 */
export const NOTA_AJUSTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.notaAjuste.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.notaAjuste.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.notaAjuste.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.notaAjuste.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.notaAjuste.columns.proveedor',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.notaAjuste.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.notaAjuste.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.notaAjuste.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.notaAjuste.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.notaAjuste.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.notaAjuste.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const NOTA_AJUSTE_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.notaAjuste.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.notaAjuste.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.notaAjuste.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.notaAjuste.columns.proveedor',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.notaAjuste.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.notaAjuste.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.notaAjuste.filters.contabilizado',
    type: 'boolean',
  },
];
