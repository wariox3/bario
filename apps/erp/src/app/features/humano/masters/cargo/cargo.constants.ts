import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CARGOS_FILTERS_STORAGE_KEY = 'cargos:filters:v1';
export const CARGOS_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const CARGO_LIST_PATH = ['humano', 'cargos'] as const;

export const CARGOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.cargo.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'codigo',
    headerKey: 'entities.cargo.columns.codigo',
    type: 'number',
    align: 'right',
  },
  {
    field: 'nombre',
    headerKey: 'entities.cargo.columns.nombre',
    type: 'text',
  },
  {
    field: 'estado_inactivo',
    headerKey: 'entities.cargo.columns.estado',
    type: 'boolean',
  },
];

export const CARGOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.cargo.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.cargo.columns.codigo', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.cargo.columns.nombre', type: 'string' },
  {
    name: 'estado_inactivo',
    displayNameKey: 'entities.cargo.columns.estado',
    type: 'boolean',
  },
];

export const CARGOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CARGOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CARGOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
