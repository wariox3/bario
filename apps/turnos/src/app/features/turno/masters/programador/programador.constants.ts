import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const PROGRAMADORES_FILTERS_STORAGE_KEY = 'programadores:filters:v1';
export const PROGRAMADORES_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const PROGRAMADOR_LIST_PATH = ['programadores'] as const;

export const PROGRAMADORES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.programador.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'nombre',
    headerKey: 'entities.programador.columns.nombre',
    type: 'text',
  },
  {
    field: 'estado_inactivo',
    headerKey: 'entities.programador.columns.estado',
    type: 'boolean',
    width: '90px',
    align: 'center',
  },
];

export const PROGRAMADORES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.programador.columns.id', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.programador.columns.nombre', type: 'string' },
  {
    name: 'estado_inactivo',
    displayNameKey: 'entities.programador.columns.estado',
    type: 'boolean',
  },
];

export const PROGRAMADORES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const PROGRAMADORES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const PROGRAMADORES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
