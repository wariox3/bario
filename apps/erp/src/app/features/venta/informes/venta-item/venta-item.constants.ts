import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const VENTA_ITEM_FILTERS_STORAGE_KEY = 'venta-item:filters:v1';

/**
 * Columnas del informe, en el orden del informe original: identificación del
 * documento (tipo, número, fecha), del contacto y del ítem, y los montos de la
 * línea (cantidad, precio, subtotal, impuesto, total).
 */
export const VENTA_ITEM_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.ventaItem.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'documento_tipo_nombre',
    headerKey: 'entities.ventaItem.columns.documentoTipo',
    type: 'text',
    width: '140px',
  },
  {
    field: 'documento_numero',
    headerKey: 'entities.ventaItem.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'documento_fecha',
    headerKey: 'entities.ventaItem.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_numero_identificacion',
    headerKey: 'entities.ventaItem.columns.identificacion',
    type: 'text',
    width: '130px',
  },
  { field: 'contacto_nombre', headerKey: 'entities.ventaItem.columns.contacto', type: 'text' },
  {
    field: 'item_id',
    headerKey: 'entities.ventaItem.columns.itemId',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  { field: 'item_nombre', headerKey: 'entities.ventaItem.columns.item', type: 'text' },
  {
    field: 'cantidad',
    headerKey: 'entities.ventaItem.columns.cantidad',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'precio',
    headerKey: 'entities.ventaItem.columns.precio',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'subtotal',
    headerKey: 'entities.ventaItem.columns.subtotal',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'impuesto',
    headerKey: 'entities.ventaItem.columns.impuesto',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.ventaItem.columns.total',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
];

/** Campos por los que se puede filtrar (columnas descriptivas; no los montos calculados). */
export const VENTA_ITEM_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.ventaItem.columns.id', type: 'number' },
  {
    name: 'documento_numero',
    displayNameKey: 'entities.ventaItem.columns.numero',
    type: 'string',
  },
  { name: 'documento_fecha', displayNameKey: 'entities.ventaItem.columns.fecha', type: 'date' },
  { name: 'item_id', displayNameKey: 'entities.ventaItem.columns.itemId', type: 'number' },
  { name: 'item_nombre', displayNameKey: 'entities.ventaItem.columns.item', type: 'string' },
  {
    name: 'contacto_nombre',
    displayNameKey: 'entities.ventaItem.columns.contacto',
    type: 'string',
  },
  {
    name: 'contacto_numero_identificacion',
    displayNameKey: 'entities.ventaItem.columns.identificacion',
    type: 'string',
  },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar). Se mantiene el
 * grupo para seguir el estándar de los listados (ej. pendiente-facturar).
 */
export const VENTA_ITEM_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
