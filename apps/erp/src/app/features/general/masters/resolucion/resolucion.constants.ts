import type { ColumnDef, FilterCondition, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { ResolucionTipo } from './resolucion.model';

export const RESOLUCIONES_QUICK_SEARCH_FIELD = 'prefijo';

/** Cota superior de un entero (int32 del backend) para los consecutivos. */
export const CONSECUTIVO_MAX = 2147483647;

/** Clave de persistencia de filtros, segmentada por tipo (venta/compra). */
export function resolucionesFiltersStorageKey(tipo: ResolucionTipo): string {
  return `resoluciones:${tipo}:filters:v1`;
}

/**
 * Filtro fijo del listado: en Venta solo se ven resoluciones con `venta=true`,
 * en Compra solo las de `compra=true`. Se concatena a los filtros del usuario.
 */
export function resolucionTipoFilter(tipo: ResolucionTipo): FilterCondition {
  return { field: tipo, operator: 'eq', value: true };
}

export const RESOLUCIONES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.resolucion.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'prefijo',
    headerKey: 'entities.resolucion.columns.prefijo',
    type: 'text',
  },
  {
    field: 'numero',
    headerKey: 'entities.resolucion.columns.numero',
    type: 'text',
  },
  {
    field: 'consecutivo_desde',
    headerKey: 'entities.resolucion.columns.consecutivoDesde',
    type: 'number',
    align: 'right',
  },
  {
    field: 'consecutivo_hasta',
    headerKey: 'entities.resolucion.columns.consecutivoHasta',
    type: 'number',
    align: 'right',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.resolucion.columns.fechaDesde',
    type: 'date',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.resolucion.columns.fechaHasta',
    type: 'date',
  },
];

export const RESOLUCIONES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.resolucion.columns.id', type: 'number' },
  { name: 'prefijo', displayNameKey: 'entities.resolucion.columns.prefijo', type: 'string' },
  { name: 'numero', displayNameKey: 'entities.resolucion.columns.numero', type: 'string' },
  {
    name: 'consecutivo_desde',
    displayNameKey: 'entities.resolucion.columns.consecutivoDesde',
    type: 'number',
  },
  {
    name: 'consecutivo_hasta',
    displayNameKey: 'entities.resolucion.columns.consecutivoHasta',
    type: 'number',
  },
  { name: 'fecha_desde', displayNameKey: 'entities.resolucion.columns.fechaDesde', type: 'date' },
  { name: 'fecha_hasta', displayNameKey: 'entities.resolucion.columns.fechaHasta', type: 'date' },
];

export const RESOLUCIONES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const RESOLUCIONES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const RESOLUCIONES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
