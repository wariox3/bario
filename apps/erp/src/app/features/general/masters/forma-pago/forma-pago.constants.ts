import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const FORMAS_PAGO_FILTERS_STORAGE_KEY = 'formas-pago:filters:v1';
export const FORMAS_PAGO_QUICK_SEARCH_FIELD = 'nombre';

/** Segmento de ruta del listado, relativo al módulo activo (se antepone en runtime). */
export const FORMA_PAGO_LIST_PATH = ['formas-pago'] as const;

export const FORMAS_PAGO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.formaPago.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'nombre', headerKey: 'entities.formaPago.columns.nombre', type: 'text' },
  { field: 'cuenta_nombre', headerKey: 'entities.formaPago.columns.cuenta', type: 'text' },
];

export const FORMAS_PAGO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.formaPago.columns.id', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.formaPago.columns.nombre', type: 'string' },
];

export const FORMAS_PAGO_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const FORMAS_PAGO_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const FORMAS_PAGO_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
