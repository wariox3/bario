import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const EXISTENCIA_ALMACEN_FILTERS_STORAGE_KEY = 'existencia-almacen:filters:v1';

/**
 * Columnas del informe: identificación del par ítem/almacén y sus saldos.
 *
 * Los saldos son campos calculados por el backend: se muestran pero **no** son
 * ordenables (igual que en el legacy).
 */
export const EXISTENCIA_ALMACEN_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.existenciaAlmacen.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'item__nombre',
    headerKey: 'entities.existenciaAlmacen.columns.item',
    type: 'text',
    sortable: true,
  },
  {
    field: 'almacen__nombre',
    headerKey: 'entities.existenciaAlmacen.columns.almacen',
    type: 'text',
    sortable: true,
  },
  {
    field: 'existencia',
    headerKey: 'entities.existenciaAlmacen.columns.existencia',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'remision',
    headerKey: 'entities.existenciaAlmacen.columns.remision',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'disponible',
    headerKey: 'entities.existenciaAlmacen.columns.disponible',
    type: 'number',
    width: '110px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar: los descriptivos del par ítem/almacén
 * (los saldos quedan fuera por ser calculados).
 *
 * El legacy pasaba `[]` al constructor de filtros —el informe quedó sin
 * filtros—, pero su mapeo sí declaraba ítem y almacén como filtrables; se
 * habilitan acá porque sin ellos el informe es inusable cuando hay muchos
 * ítems. Los nombres siguen el lookup de Django del legacy.
 */
export const EXISTENCIA_ALMACEN_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.existenciaAlmacen.columns.id', type: 'number' },
  {
    name: 'item__nombre',
    displayNameKey: 'entities.existenciaAlmacen.columns.item',
    type: 'string',
  },
  {
    name: 'almacen__nombre',
    displayNameKey: 'entities.existenciaAlmacen.columns.almacen',
    type: 'string',
  },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar).
 */
export const EXISTENCIA_ALMACEN_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
