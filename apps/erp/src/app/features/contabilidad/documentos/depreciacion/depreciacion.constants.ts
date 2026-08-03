import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Endpoint que genera las líneas del documento a partir de los activos fijos.
 *
 * ⚠️ **Supuesto**: tomado del ERP legacy (`DepreciacionService.cargarActivos`),
 * que hace `POST` con `{ id }` del documento. Sin verificar contra el backend.
 */
export const CARGAR_ACTIVOS_ENDPOINT = '/general/documento/cargar-activo/';

/**
 * Columnas visibles del listado de Depreciación.
 *
 * La depreciación no tiene subtotal ni impuestos: sus líneas son el cálculo por
 * activo fijo. El set se queda en identificación del documento, tercero, total
 * depreciado y estados. Los `field` mapean el shape de `general/documento/lista/`.
 */
export const DEPRECIACION_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.depreciacion.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.depreciacion.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.depreciacion.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.depreciacion.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.depreciacion.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.depreciacion.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.depreciacion.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.depreciacion.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.depreciacion.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const DEPRECIACION_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.depreciacion.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.depreciacion.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.depreciacion.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.depreciacion.columns.contacto',
    type: 'string',
  },
  {
    name: 'estado_aprobado',
    displayNameKey: 'entities.depreciacion.filters.aprobado',
    type: 'boolean',
  },
  {
    name: 'estado_anulado',
    displayNameKey: 'entities.depreciacion.filters.anulado',
    type: 'boolean',
  },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.depreciacion.filters.contabilizado',
    type: 'boolean',
  },
];
