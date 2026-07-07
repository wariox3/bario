import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` del plazo de pago (alimenta el autocálculo de vencimiento). */
export const PLAZO_PAGO_ENDPOINT = '/general/plazo-pago/seleccionar/';
/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';

/**
 * Columnas visibles del listado de Factura de venta.
 *
 * Mismo set que los documentos de servicio (id, identificación, desglose de
 * montos y flags de estado), salvo las columnas de horas (`horas`,
 * `horas_diurnas`, `horas_nocturnas`), que son específicas de supervigilancia:
 * la factura es comercial (ítem/cantidad/precio) y no las trae.
 *
 * Los `field` mapean el shape canónico del endpoint `general/documento/lista/`
 * (`DocumentoListRowBase`): identificación como `tercero_numero_identificacion`,
 * montos `currency` y estados como flags booleanos.
 */
export const FACTURA_VENTA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.facturaVenta.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.facturaVenta.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.facturaVenta.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.facturaVenta.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.facturaVenta.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.facturaVenta.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.facturaVenta.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.facturaVenta.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.facturaVenta.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.facturaVenta.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.facturaVenta.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado (mismo set que los documentos de servicio). El
 * filtro implícito `documento_tipo_id` lo inyecta el gateway desde el config;
 * aquí solo van los del usuario.
 */
export const FACTURA_VENTA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.facturaVenta.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.facturaVenta.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.facturaVenta.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.facturaVenta.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.facturaVenta.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.facturaVenta.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_electronico',
    displayNameKey: 'entities.facturaVenta.filters.electronico',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.facturaVenta.filters.contabilizado',
    type: 'boolean',
  },
];
