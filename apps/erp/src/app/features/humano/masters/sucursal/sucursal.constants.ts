import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const SUCURSALES_FILTERS_STORAGE_KEY = 'sucursales:filters:v1';
export const SUCURSALES_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const SUCURSAL_LIST_PATH = ['humano', 'sucursales'] as const;

export const SUCURSALES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.sucursal.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'codigo',
    headerKey: 'entities.sucursal.columns.codigo',
    type: 'text',
  },
  {
    field: 'nombre',
    headerKey: 'entities.sucursal.columns.nombre',
    type: 'text',
  },
];

export const SUCURSALES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.sucursal.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.sucursal.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.sucursal.columns.nombre', type: 'string' },
];

export const SUCURSALES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const SUCURSALES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const SUCURSALES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
