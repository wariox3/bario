import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const EMPLEADOS_FILTERS_STORAGE_KEY = 'empleados:filters:v1';

/** Campo sobre el que opera la búsqueda rápida del toolbar. */
export const EMPLEADOS_QUICK_SEARCH_FIELD = 'nombre_corto';

/** Segmento de ruta del listado, relativo al módulo Humano. */
export const EMPLEADO_LIST_PATH = ['empleados'] as const;

/**
 * Filtro base inmutable del master: la lista de empleados es el subconjunto de
 * contactos con `empleado=true`. Se mergea **siempre** con la búsqueda rápida y
 * los filtros activos antes de consultar.
 */
export const EMPLEADO_BASE_FILTER: FilterCondition = {
  field: 'empleado',
  operator: 'eq',
  value: true,
};

export const EMPLEADOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.empleado.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'identificacion_abreviatura',
    headerKey: 'entities.empleado.columns.identificacion_abreviatura',
    type: 'text',
    width: '80px',
  },
  {
    field: 'numero_identificacion',
    headerKey: 'entities.empleado.columns.identificacion',
    type: 'text',
  },
  { field: 'nombre_corto', headerKey: 'entities.empleado.columns.nombre', type: 'text' },
  { field: 'correo', headerKey: 'entities.empleado.columns.correo', type: 'text' },
  { field: 'celular', headerKey: 'entities.empleado.columns.celular', type: 'text' },
];

export const EMPLEADOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.empleado.columns.id', type: 'number' },
  {
    name: 'numero_identificacion',
    displayNameKey: 'entities.empleado.columns.identificacion',
    type: 'string',
  },
  { name: 'nombre_corto', displayNameKey: 'entities.empleado.columns.nombre', type: 'string' },
  { name: 'correo', displayNameKey: 'entities.empleado.columns.correo', type: 'string' },
  { name: 'celular', displayNameKey: 'entities.empleado.columns.celular', type: 'string' },
];

export const EMPLEADOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const EMPLEADOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const EMPLEADOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
