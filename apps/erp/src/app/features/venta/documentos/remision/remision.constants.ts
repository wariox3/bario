import type { ColumnDef, FilterField } from '@reddoc/core';

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de almacenes (esquema de inventario). */
export const ALMACEN_ENDPOINT = '/inventario/almacen/seleccionar/';

/**
 * Columnas visibles del listado de Remisión.
 *
 * Mismo set que la factura de venta (id, número, fecha, identificación, contacto,
 * desglose de montos y flags de estado): la remisión es un documento comercial que
 * comparte el shape canónico del endpoint `general/documento/lista/`
 * (`DocumentoListRowBase`).
 */
export const REMISION_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.remision.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.remision.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.remision.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.remision.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.remision.columns.contacto',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.remision.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.remision.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.remision.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.remision.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.remision.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.remision.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const REMISION_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.remision.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.remision.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.remision.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.remision.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.remision.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.remision.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.remision.filters.contabilizado',
    type: 'boolean',
  },
];
