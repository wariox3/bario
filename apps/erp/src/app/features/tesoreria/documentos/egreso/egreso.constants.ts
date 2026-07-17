import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Catálogo de cuentas bancarias del select de la cabecera.
 *
 * Vive acá (y no en `SELECT_ENDPOINTS`) porque solo lo usan los formularios de
 * cartera/tesorería, y los bounded contexts no se importan entre sí (mismo
 * trade-off que hizo el pago).
 *
 * ⚠️ Endpoint **supuesto**: sigue la convención `seleccionar/` del resto de las
 * cabeceras del ERP, pero el legacy alimenta este select desde el listado
 * (`general/cuenta-banco/` con `ordering=id`) y no se pudo verificar contra el
 * backend. Si no existe, el select llega vacío y el fix es este string.
 */
export const CUENTA_BANCO_ENDPOINT = '/general/cuenta-banco/seleccionar/';

/**
 * Columnas visibles del listado de Egreso.
 *
 * El egreso es el **desembolso de tesorería** (paga las CxP), no un documento
 * comercial: no tiene subtotal ni impuestos (sus líneas son movimientos
 * contables), así que el set se queda en identificación del documento,
 * proveedor, total desembolsado y estados. Espejo de las columnas del pago.
 */
export const EGRESO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.egreso.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.egreso.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.egreso.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.egreso.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.egreso.columns.proveedor',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.egreso.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.egreso.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.egreso.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.egreso.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const EGRESO_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.egreso.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.egreso.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.egreso.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.egreso.columns.proveedor',
    type: 'string',
  },
  { name: 'estado_aprobado', displayNameKey: 'entities.egreso.filters.aprobado', type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: 'entities.egreso.filters.anulado', type: 'boolean' },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.egreso.filters.contabilizado',
    type: 'boolean',
  },
];
