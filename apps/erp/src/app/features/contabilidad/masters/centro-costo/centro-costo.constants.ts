import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CENTROS_COSTO_FILTERS_STORAGE_KEY = 'centros-costo:filters:v1';
export const CENTROS_COSTO_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const CENTRO_COSTO_LIST_PATH = ['contabilidad', 'centros-costo'] as const;

export const CENTROS_COSTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.centroCosto.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'codigo',
    headerKey: 'entities.centroCosto.columns.codigo',
    type: 'text',
  },
  {
    field: 'nombre',
    headerKey: 'entities.centroCosto.columns.nombre',
    type: 'text',
  },
  {
    field: 'estado_inactivo',
    headerKey: 'entities.centroCosto.columns.estado',
    type: 'boolean',
  },
];

export const CENTROS_COSTO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.centroCosto.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.centroCosto.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.centroCosto.columns.nombre', type: 'string' },
  {
    name: 'estado_inactivo',
    displayNameKey: 'entities.centroCosto.columns.estado',
    type: 'boolean',
  },
];

export const CENTROS_COSTO_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CENTROS_COSTO_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CENTROS_COSTO_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
