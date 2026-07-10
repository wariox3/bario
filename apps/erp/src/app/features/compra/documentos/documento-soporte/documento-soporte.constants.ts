import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';
/** Endpoint `seleccionar` de formas de pago. */
export const FORMA_PAGO_ENDPOINT = '/general/forma-pago/seleccionar/';
/** Endpoint `seleccionar` de resoluciones (se filtra a las de compra vía `params`). */
export const RESOLUCION_ENDPOINT = '/general/resolucion/seleccionar/';

/**
 * Columnas visibles del listado de Documento soporte.
 *
 * Mismo set canónico de `DocumentoListRowBase` que la factura de compra (id,
 * número, fecha, identificación del proveedor, desglose de montos y flags de
 * estado). Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const DOCUMENTO_SOPORTE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.documentoSoporte.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.documentoSoporte.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.documentoSoporte.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.documentoSoporte.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.documentoSoporte.columns.proveedor',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.documentoSoporte.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.documentoSoporte.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.documentoSoporte.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.documentoSoporte.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.documentoSoporte.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.documentoSoporte.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const DOCUMENTO_SOPORTE_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.documentoSoporte.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.documentoSoporte.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.documentoSoporte.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.documentoSoporte.columns.proveedor',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.documentoSoporte.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.documentoSoporte.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.documentoSoporte.filters.contabilizado',
    type: 'boolean',
  },
];
