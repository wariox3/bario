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
 * Id, fecha, proveedor y montos. Sin número ni banderas de anulado/contabilizado:
 * la recurrente es una plantilla que no se aprueba, así que nunca recibe
 * consecutivo ni se anula o contabiliza —esas columnas saldrían siempre vacías—.
 * Los `field` mapean el shape de `general/documento/lista/` (`DocumentoListRowBase`).
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
    field: 'fecha',
    headerKey: 'entities.facturaCompraRecurrente.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'entities.facturaCompraRecurrente.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre_corto',
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
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const FACTURA_COMPRA_RECURRENTE_FILTERS: readonly FilterField[] = [
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
];
