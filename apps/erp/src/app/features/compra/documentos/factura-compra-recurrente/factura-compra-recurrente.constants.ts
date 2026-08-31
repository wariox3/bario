import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` del plazo de pago. */
export const PLAZO_PAGO_ENDPOINT = '/general/plazo-pago/seleccionar/';
/** Endpoint `seleccionar` de formas de pago. */
export const FORMA_PAGO_ENDPOINT = '/general/forma-pago/seleccionar/';
/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';

/**
 * Columnas visibles del listado de Factura de compra recurrente.
 *
 * Mismo set canónico de `DocumentoListRowBase` que la factura de compra (id,
 * número, fecha, identificación del proveedor, desglose de montos y flags de
 * estado). Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const FACTURA_COMPRA_RECURRENTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.facturaCompraRecurrente.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.facturaCompraRecurrente.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.facturaCompraRecurrente.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.facturaCompraRecurrente.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.facturaCompraRecurrente.columns.proveedor',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.facturaCompraRecurrente.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.facturaCompraRecurrente.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.facturaCompraRecurrente.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.facturaCompraRecurrente.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.facturaCompraRecurrente.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const FACTURA_COMPRA_RECURRENTE_FILTERS: readonly FilterField[] = [
  {
    name: 'numero',
    displayNameKey: 'entities.facturaCompraRecurrente.columns.numero',
    type: 'string',
  },
  { name: 'fecha', displayNameKey: 'entities.facturaCompraRecurrente.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.facturaCompraRecurrente.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.facturaCompraRecurrente.columns.proveedor',
    type: 'string',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.facturaCompraRecurrente.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.facturaCompraRecurrente.filters.contabilizado',
    type: 'boolean',
  },
];
