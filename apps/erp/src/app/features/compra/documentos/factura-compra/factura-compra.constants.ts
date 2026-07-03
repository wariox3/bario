import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` del plazo de pago (alimenta el autocálculo de vencimiento). */
export const PLAZO_PAGO_ENDPOINT = '/general/plazo-pago/seleccionar/';
/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';

/**
 * Columnas visibles del listado de Factura de compra.
 *
 * Mismo set canónico de `DocumentoListRowBase` que los documentos de venta
 * (id, número, fecha, identificación del proveedor, desglose de montos y flags
 * de estado). Los `field` mapean el shape del endpoint `general/documento/lista/`:
 * identificación como `tercero_numero_identificacion`, montos `currency` y
 * estados como flags booleanos.
 */
export const FACTURA_COMPRA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.facturaCompra.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.facturaCompra.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.facturaCompra.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.facturaCompra.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.facturaCompra.columns.proveedor',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.facturaCompra.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.facturaCompra.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.facturaCompra.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.facturaCompra.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.facturaCompra.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.facturaCompra.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario. La compra
 * recibida no la emitimos nosotros, así que no hay filtro `estado_electronico`.
 */
export const FACTURA_COMPRA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.facturaCompra.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.facturaCompra.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.facturaCompra.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.facturaCompra.columns.proveedor',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.facturaCompra.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.facturaCompra.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.facturaCompra.filters.contabilizado',
    type: 'boolean',
  },
];
