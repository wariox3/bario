import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CREDITOS_FILTERS_STORAGE_KEY = 'creditos:filters:v1';
export const CREDITOS_QUICK_SEARCH_FIELD = 'contrato_nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const CREDITO_LIST_PATH = ['humano', 'creditos'] as const;

/** Endpoint del selector de concepto (búsqueda por `nombre__icontains`). */
export const CONCEPTO_ENDPOINT = '/humano/concepto/seleccionar/';

export const CREDITOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'contrato_nombre',
    headerKey: 'entities.credito.columns.contrato',
    type: 'text',
  },
  {
    field: 'concepto_nombre',
    headerKey: 'entities.credito.columns.concepto',
    type: 'text',
  },
  {
    field: 'fecha_inicio',
    headerKey: 'entities.credito.columns.inicio',
    type: 'date',
  },
  {
    field: 'total',
    headerKey: 'entities.credito.columns.total',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'cuota',
    headerKey: 'entities.credito.columns.cuota',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'cantidad_cuotas',
    headerKey: 'entities.credito.columns.cantidadCuotas',
    type: 'number',
    align: 'right',
  },
  {
    field: 'saldo',
    headerKey: 'entities.credito.columns.saldo',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'inactivo',
    headerKey: 'entities.credito.columns.inactivo',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
];

export const CREDITOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'contrato_nombre', displayNameKey: 'entities.credito.columns.contrato', type: 'string' },
  { name: 'concepto_nombre', displayNameKey: 'entities.credito.columns.concepto', type: 'string' },
  { name: 'fecha_inicio', displayNameKey: 'entities.credito.columns.inicio', type: 'date' },
  { name: 'total', displayNameKey: 'entities.credito.columns.total', type: 'number' },
  { name: 'saldo', displayNameKey: 'entities.credito.columns.saldo', type: 'number' },
  { name: 'inactivo', displayNameKey: 'entities.credito.columns.inactivo', type: 'boolean' },
];

export const CREDITOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CREDITOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CREDITOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
