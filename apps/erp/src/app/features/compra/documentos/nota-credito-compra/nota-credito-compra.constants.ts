import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Endpoint (GET) que lista los documentos referenciables por la nota crédito.
 *
 * Reusa el endpoint genérico de documentos con el `serializador=referencia`
 * (mismo contrato que el legacy). Se acota por proveedor + tipo COMPRA + estado
 * aprobado desde el formulario. Es de uso único de esta feature, por eso vive
 * aquí y no en `SELECT_ENDPOINTS` (que centraliza solo catálogos cross-form).
 */
export const NOTA_CREDITO_COMPRA_REFERENCIA_ENDPOINT = '/general/documento/';

/**
 * Columnas visibles del listado de Nota crédito de compra.
 *
 * Mismo set canónico de `DocumentoListRowBase` que la factura de compra (id,
 * número, fecha, identificación del proveedor, desglose de montos y flags de
 * estado). Los `field` mapean el shape del endpoint `general/documento/lista/`.
 */
export const NOTA_CREDITO_COMPRA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.notaCreditoCompra.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.notaCreditoCompra.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.notaCreditoCompra.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.notaCreditoCompra.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.notaCreditoCompra.columns.proveedor',
    type: 'text',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.notaCreditoCompra.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.notaCreditoCompra.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.notaCreditoCompra.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.notaCreditoCompra.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.notaCreditoCompra.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.notaCreditoCompra.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const NOTA_CREDITO_COMPRA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.notaCreditoCompra.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.notaCreditoCompra.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.notaCreditoCompra.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.notaCreditoCompra.columns.proveedor',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.notaCreditoCompra.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.notaCreditoCompra.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.notaCreditoCompra.filters.contabilizado',
    type: 'boolean',
  },
];
