import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const INVENTARIO_VALORIZADO_FILTERS_STORAGE_KEY = 'inventario-valorizado:filters:v1';

/**
 * Columnas del informe: las de existencias más la valorización (costo promedio
 * de la unidad y costo total de las existencias).
 *
 * Los saldos y los costos son campos calculados por el backend: se muestran
 * pero **no** son ordenables (igual que en el legacy).
 */
export const INVENTARIO_VALORIZADO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.inventarioValorizado.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'codigo',
    headerKey: 'entities.inventarioValorizado.columns.codigo',
    type: 'text',
    width: '140px',
    sortable: true,
  },
  {
    field: 'nombre',
    headerKey: 'entities.inventarioValorizado.columns.nombre',
    type: 'text',
    sortable: true,
  },
  {
    field: 'referencia',
    headerKey: 'entities.inventarioValorizado.columns.referencia',
    type: 'text',
  },
  {
    field: 'existencia',
    headerKey: 'entities.inventarioValorizado.columns.existencia',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'remision',
    headerKey: 'entities.inventarioValorizado.columns.remision',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'disponible',
    headerKey: 'entities.inventarioValorizado.columns.disponible',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'costo_promedio',
    headerKey: 'entities.inventarioValorizado.columns.costoPromedio',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'costo_total',
    headerKey: 'entities.inventarioValorizado.columns.costoTotal',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar: los descriptivos del ítem. Los saldos y
 * los costos quedan fuera por ser calculados; `inventario` tampoco se ofrece
 * porque el informe ya lo fija como filtro implícito (ver el servicio).
 *
 * El legacy pasaba `[]` al constructor de filtros —el informe quedó sin
 * filtros—, pero su mapeo sí los declaraba filtrables; se habilitan acá porque
 * sin ellos el informe es inusable cuando hay muchos ítems.
 */
export const INVENTARIO_VALORIZADO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.inventarioValorizado.columns.id', type: 'number' },
  {
    name: 'codigo',
    displayNameKey: 'entities.inventarioValorizado.columns.codigo',
    type: 'string',
  },
  {
    name: 'nombre',
    displayNameKey: 'entities.inventarioValorizado.columns.nombre',
    type: 'string',
  },
  {
    name: 'referencia',
    displayNameKey: 'entities.inventarioValorizado.columns.referencia',
    type: 'string',
  },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar).
 */
export const INVENTARIO_VALORIZADO_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
