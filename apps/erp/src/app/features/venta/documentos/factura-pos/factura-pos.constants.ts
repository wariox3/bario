import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';
/** Endpoint `seleccionar` de cuentas de banco (destino de los pagos del POS). */
export const CUENTA_BANCO_ENDPOINT = '/general/cuenta-banco/seleccionar/';

/**
 * Columnas visibles del listado de Factura POS.
 *
 * Mismo set que la factura de venta (id, identificación, desglose de montos y
 * flags de estado): ambas son comerciales (ítem/cantidad/precio) y comparten el
 * shape canónico del endpoint `general/documento/lista/` (`DocumentoListRowBase`).
 */
export const FACTURA_POS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.facturaPos.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.facturaPos.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.facturaPos.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.facturaPos.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.facturaPos.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.facturaPos.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.facturaPos.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.facturaPos.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.facturaPos.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.facturaPos.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.facturaPos.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado (mismo set que la factura de venta). El filtro
 * implícito `documento_tipo_id` lo inyecta el gateway desde el config; aquí solo
 * van los del usuario.
 */
export const FACTURA_POS_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.facturaPos.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.facturaPos.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.facturaPos.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.facturaPos.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.facturaPos.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.facturaPos.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.facturaPos.filters.contabilizado',
    type: 'boolean',
  },
];
