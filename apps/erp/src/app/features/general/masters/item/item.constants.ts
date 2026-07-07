import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const ITEMS_FILTERS_STORAGE_KEY = 'items:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo y
 * viaja junto a los filtros avanzados (ver `quickSearchCondition`).
 */
export const ITEMS_QUICK_SEARCH_FIELD = 'nombre';

/** Segmento de ruta del listado, relativo al módulo activo (se antepone en runtime). */
export const ITEM_LIST_PATH = ['items'] as const;

export const ITEMS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.item.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'codigo', headerKey: 'entities.item.columns.codigo', type: 'text' },
  { field: 'nombre', headerKey: 'entities.item.columns.nombre', type: 'text' },
  { field: 'referencia', headerKey: 'entities.item.columns.referencia', type: 'text' },
  {
    field: 'precio',
    headerKey: 'entities.item.columns.precio',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'producto',
    headerKey: 'entities.item.columns.producto',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'servicio',
    headerKey: 'entities.item.columns.servicio',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'inventario',
    headerKey: 'entities.item.columns.inventario',
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 *
 * Reutilizan las mismas claves i18n que las columnas como label visible. El
 * `type` determina qué operadores ofrece el modal (ver `FILTER_OPERATORS`).
 */
export const ITEMS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.item.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.item.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.item.columns.nombre', type: 'string' },
  { name: 'referencia', displayNameKey: 'entities.item.columns.referencia', type: 'string' },
  { name: 'precio', displayNameKey: 'entities.item.columns.precio', type: 'number' },
  { name: 'producto', displayNameKey: 'entities.item.columns.producto', type: 'boolean' },
  { name: 'servicio', displayNameKey: 'entities.item.columns.servicio', type: 'boolean' },
  { name: 'inventario', displayNameKey: 'entities.item.columns.inventario', type: 'boolean' },
];

export const ITEMS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const ITEMS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const ITEMS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
