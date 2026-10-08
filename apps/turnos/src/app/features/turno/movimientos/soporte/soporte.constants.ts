import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const SOPORTES_FILTERS_STORAGE_KEY = 'soportes:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo.
 */
export const SOPORTES_QUICK_SEARCH_FIELD = 'grupo_nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const SOPORTE_LIST_PATH = ['soportes'] as const;

/** Columnas visibles del listado. */
export const SOPORTES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.soporte.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'fecha_desde', headerKey: 'entities.soporte.columns.fechaDesde', type: 'date' },
  { field: 'fecha_hasta', headerKey: 'entities.soporte.columns.fechaHasta', type: 'date' },
  {
    field: 'fecha_hasta_periodo',
    headerKey: 'entities.soporte.columns.fechaHastaPeriodo',
    type: 'date',
  },
  { field: 'grupo_id', headerKey: 'entities.soporte.columns.grupo', type: 'number' },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 * El `type` determina qué operadores ofrece el modal.
 */
export const SOPORTES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.soporte.columns.id', type: 'number' },
  { name: 'fecha_desde', displayNameKey: 'entities.soporte.columns.fechaDesde', type: 'date' },
  { name: 'fecha_hasta', displayNameKey: 'entities.soporte.columns.fechaHasta', type: 'date' },
  {
    name: 'fecha_hasta_periodo',
    displayNameKey: 'entities.soporte.columns.fechaHastaPeriodo',
    type: 'date',
  },
  { name: 'grupo_id', displayNameKey: 'entities.soporte.columns.grupo', type: 'number' },
];

export const SOPORTES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const SOPORTES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
