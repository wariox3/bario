import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const ALMACENES_FILTERS_STORAGE_KEY = 'almacenes:filters:v1';
export const ALMACENES_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const ALMACEN_LIST_PATH = ['inventario', 'almacenes'] as const;

/** URL de la exportación a Excel del listado. */
export const ALMACENES_EXPORT_URL = '/inventario/almacen/excel/';

/** Dos columnas, que es todo lo que el master tiene. */
export const ALMACENES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.almacen.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'nombre', headerKey: 'entities.almacen.columns.nombre', type: 'text' },
];

export const ALMACENES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.almacen.columns.id', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.almacen.columns.nombre', type: 'string' },
];

export const ALMACENES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const ALMACENES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const ALMACENES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
