import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const ASESORES_FILTERS_STORAGE_KEY = 'asesores:filters:v1';
export const ASESORES_QUICK_SEARCH_FIELD = 'nombre_corto';

/** Segmento de ruta del listado, relativo al módulo activo (se antepone en runtime). */
export const ASESOR_LIST_PATH = ['asesores'] as const;

export const ASESORES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.asesor.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'nombre_corto',
    headerKey: 'entities.asesor.columns.nombreCorto',
    type: 'text',
  },
  {
    field: 'celular',
    headerKey: 'entities.asesor.columns.celular',
    type: 'text',
  },
  {
    field: 'correo',
    headerKey: 'entities.asesor.columns.correo',
    type: 'text',
  },
];

export const ASESORES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.asesor.columns.id', type: 'number' },
  { name: 'nombre_corto', displayNameKey: 'entities.asesor.columns.nombreCorto', type: 'string' },
  { name: 'celular', displayNameKey: 'entities.asesor.columns.celular', type: 'string' },
  { name: 'correo', displayNameKey: 'entities.asesor.columns.correo', type: 'string' },
];

export const ASESORES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const ASESORES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const ASESORES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
