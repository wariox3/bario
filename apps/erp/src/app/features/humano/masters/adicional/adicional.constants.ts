import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const ADICIONALES_FILTERS_STORAGE_KEY = 'adicionales:filters:v1';
export const ADICIONALES_QUICK_SEARCH_FIELD = 'contrato_nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const ADICIONAL_LIST_PATH = ['humano', 'adicionales'] as const;

/** Endpoint del selector de concepto (búsqueda por `nombre__icontains`). */
export const CONCEPTO_ENDPOINT = '/humano/concepto/seleccionar/';

export const ADICIONALES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'contrato_nombre',
    headerKey: 'entities.adicional.columns.contrato',
    type: 'text',
  },
  {
    field: 'concepto_nombre',
    headerKey: 'entities.adicional.columns.concepto',
    type: 'text',
  },
  {
    field: 'valor',
    headerKey: 'entities.adicional.columns.valor',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'detalle',
    headerKey: 'entities.adicional.columns.detalle',
    type: 'text',
  },
  {
    field: 'aplica_dia_laborado',
    headerKey: 'entities.adicional.columns.aplicaDiaLaborado',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
  {
    field: 'inactivo',
    headerKey: 'entities.adicional.columns.inactivo',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
];

export const ADICIONALES_FILTER_FIELDS: readonly FilterField[] = [
  {
    name: 'contrato_nombre',
    displayNameKey: 'entities.adicional.columns.contrato',
    type: 'string',
  },
  {
    name: 'concepto_nombre',
    displayNameKey: 'entities.adicional.columns.concepto',
    type: 'string',
  },
  { name: 'valor', displayNameKey: 'entities.adicional.columns.valor', type: 'number' },
  { name: 'inactivo', displayNameKey: 'entities.adicional.columns.inactivo', type: 'boolean' },
];

export const ADICIONALES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const ADICIONALES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const ADICIONALES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
