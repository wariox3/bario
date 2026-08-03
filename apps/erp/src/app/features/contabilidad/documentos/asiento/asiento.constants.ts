import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Catálogo de comprobantes contables del select de la cabecera.
 *
 * Vive acá (y no en `SELECT_ENDPOINTS`) porque hoy solo lo usa este formulario:
 * el ERP todavía no tiene master de comprobantes.
 *
 * ⚠️ Endpoint y filtro **supuestos**: tomados del ERP legacy
 * (`contabilidad/comprobante/seleccionar/` con `permite_asiento: 'True'`), sin
 * verificar contra el backend. El filtro acota a los comprobantes que admiten
 * asientos manuales; si el backend no lo soporta, el select llega con todos.
 */
export const COMPROBANTE_ENDPOINT = '/contabilidad/comprobante/seleccionar/';

/** Parámetros del select de comprobante: solo los que admiten asiento manual. */
export const COMPROBANTE_PARAMS: Record<string, string> = { permite_asiento: 'True' };

/**
 * Columnas visibles del listado de Asiento.
 *
 * El asiento es un comprobante contable manual: no tiene subtotal ni impuestos,
 * así que el set se queda en identificación del documento, tercero, soporte y
 * estados. Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const ASIENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.asiento.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.asiento.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.asiento.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'soporte',
    headerKey: 'entities.asiento.columns.soporte',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.asiento.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.asiento.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.asiento.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.asiento.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.asiento.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const ASIENTO_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.asiento.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.asiento.columns.fecha', type: 'date' },
  { name: 'soporte', displayNameKey: 'entities.asiento.columns.soporte', type: 'string' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.asiento.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.asiento.columns.contacto',
    type: 'string',
  },
  { name: 'estado_aprobado', displayNameKey: 'entities.asiento.filters.aprobado', type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: 'entities.asiento.filters.anulado', type: 'boolean' },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.asiento.filters.contabilizado',
    type: 'boolean',
  },
];
