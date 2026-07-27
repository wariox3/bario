import type { ColumnDef, FilterField } from '@reddoc/core';

export const HISTORIAL_MOVIMIENTO_FILTERS_STORAGE_KEY = 'historial-movimiento:filters:v1';

/**
 * Columnas del informe: identificación del documento que movió el inventario
 * (número, tipo, fecha, contacto), el ítem, y los montos de la línea.
 */
export const HISTORIAL_MOVIMIENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.historialMovimiento.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'documento__numero',
    headerKey: 'entities.historialMovimiento.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'documento__documento_tipo__nombre',
    headerKey: 'entities.historialMovimiento.columns.documentoTipo',
    type: 'text',
    width: '150px',
  },
  {
    field: 'documento__fecha',
    headerKey: 'entities.historialMovimiento.columns.fecha',
    type: 'date',
    width: '110px',
    sortable: true,
  },
  {
    field: 'documento__contacto__nombre_corto',
    headerKey: 'entities.historialMovimiento.columns.contacto',
    type: 'text',
  },
  {
    field: 'item__nombre',
    headerKey: 'entities.historialMovimiento.columns.item',
    type: 'text',
    sortable: true,
  },
  {
    field: 'cantidad_operada',
    headerKey: 'entities.historialMovimiento.columns.cantidad',
    type: 'number',
    width: '100px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'costo',
    headerKey: 'entities.historialMovimiento.columns.costo',
    type: 'currency',
    width: '130px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'precio',
    headerKey: 'entities.historialMovimiento.columns.precio',
    type: 'currency',
    width: '130px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'subtotal',
    headerKey: 'entities.historialMovimiento.columns.subtotal',
    type: 'currency',
    width: '140px',
    align: 'right',
    sortable: true,
  },
];

/**
 * Campos por los que se puede filtrar, tomados del mapeo del legacy. Los
 * nombres siguen su lookup de Django. `cantidad` filtra sobre la cantidad sin
 * signo, no sobre la columna `cantidad_operada` que muestra la tabla.
 */
export const HISTORIAL_MOVIMIENTO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.historialMovimiento.columns.id', type: 'number' },
  {
    name: 'documento__contacto__nombre_corto',
    displayNameKey: 'entities.historialMovimiento.columns.contacto',
    type: 'string',
  },
  {
    name: 'item__nombre',
    displayNameKey: 'entities.historialMovimiento.columns.item',
    type: 'string',
  },
  {
    name: 'cantidad',
    displayNameKey: 'entities.historialMovimiento.columns.cantidad',
    type: 'number',
  },
];
