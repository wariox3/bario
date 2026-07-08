import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Endpoint (GET) que lista los documentos referenciables por la nota débito.
 *
 * Reusa el endpoint genérico de documentos con el `serializador=referencia`
 * (mismo contrato que el legacy). Se acota por proveedor + tipo COMPRA + estado
 * aprobado desde el formulario. Es de uso único de esta feature, por eso vive
 * aquí y no en `SELECT_ENDPOINTS` (que centraliza solo catálogos cross-form).
 */
export const NOTA_DEBITO_COMPRA_REFERENCIA_ENDPOINT = '/general/documento/';

/**
 * Columnas visibles del listado de Nota débito de compra.
 *
 * Mismo set canónico de `DocumentoListRowBase` que la factura de compra (id,
 * número, fecha, identificación del proveedor, desglose de montos y flags de
 * estado). Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const NOTA_DEBITO_COMPRA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.notaDebitoCompra.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.notaDebitoCompra.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.notaDebitoCompra.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.notaDebitoCompra.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.notaDebitoCompra.columns.proveedor',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.notaDebitoCompra.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.notaDebitoCompra.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.notaDebitoCompra.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.notaDebitoCompra.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.notaDebitoCompra.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.notaDebitoCompra.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const NOTA_DEBITO_COMPRA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.notaDebitoCompra.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.notaDebitoCompra.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.notaDebitoCompra.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.notaDebitoCompra.columns.proveedor',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.notaDebitoCompra.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.notaDebitoCompra.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.notaDebitoCompra.filters.contabilizado',
    type: 'boolean',
  },
];
