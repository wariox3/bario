import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';

/**
 * Columnas visibles del listado de Factura de venta recurrente.
 *
 * Id, fecha, cliente y montos. Sin número ni banderas de anulado/contabilizado:
 * la recurrente es una plantilla que no se aprueba, así que nunca recibe
 * consecutivo ni se anula o contabiliza —esas columnas saldrían siempre vacías—.
 * Los `field` mapean el shape de `general/documento/lista/` (`DocumentoListRowBase`).
 */
export const FACTURA_VENTA_RECURRENTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.facturaVentaRecurrente.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'fecha',
    headerKey: 'entities.facturaVentaRecurrente.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'entities.facturaVentaRecurrente.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'entities.facturaVentaRecurrente.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.facturaVentaRecurrente.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.facturaVentaRecurrente.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.facturaVentaRecurrente.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const FACTURA_VENTA_RECURRENTE_FILTERS: readonly FilterField[] = [
  { name: 'fecha', displayNameKey: 'entities.facturaVentaRecurrente.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.facturaVentaRecurrente.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.facturaVentaRecurrente.columns.contacto',
    type: 'string',
  },
];
