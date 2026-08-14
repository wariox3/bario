import { type ColumnDef, type FilterField, SELECT_ENDPOINTS } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const SEDES_FILTERS_STORAGE_KEY = 'sedes:filters:v1';
export const SEDES_QUICK_SEARCH_FIELD = 'nombre';

/**
 * Segmento de ruta del master, tal como lo declara `rutaSedes()`.
 *
 * Sin módulo a propósito: sedes se abre desde general y desde venta, y el
 * módulo lo pone `masterNav` con el que esté activo.
 */
export const SEDE_SEGMENT = 'sedes';

/** Endpoint `seleccionar/` de centros de costo para el autocomplete buscable. */
export const CENTRO_COSTO_SELECT_ENDPOINT = SELECT_ENDPOINTS.centroCosto;

export const SEDES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.sede.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'codigo', headerKey: 'entities.sede.columns.codigo', type: 'text', width: '120px' },
  { field: 'nombre', headerKey: 'entities.sede.columns.nombre', type: 'text' },
  {
    field: 'centro_costo_nombre',
    headerKey: 'entities.sede.columns.centroCosto',
    type: 'text',
  },
];

export const SEDES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.sede.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.sede.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.sede.columns.nombre', type: 'string' },
];

export const SEDES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const SEDES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const SEDES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
