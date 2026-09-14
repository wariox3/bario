import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const EXISTENCIA_ALMACEN_FILTERS_STORAGE_KEY = 'existencia-almacen:filters:v1';

/**
 * Columnas del informe: identificación del par ítem/almacén, sus saldos y el
 * costo promedio de la unidad. Leen el JSON, así que van **planas**.
 *
 * **La tabla no ordena.** `excel/` no acepta `ordenamientos`, así que dejar la
 * cabecera ordenable haría que la pantalla y el archivo descargado salieran en
 * órdenes distintos sin que nadie lo avise.
 */
export const EXISTENCIA_ALMACEN_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.existenciaAlmacen.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'item_codigo',
    headerKey: 'entities.existenciaAlmacen.columns.codigo',
    type: 'text',
    width: '140px',
  },
  {
    field: 'item_nombre',
    headerKey: 'entities.existenciaAlmacen.columns.item',
    type: 'text',
  },
  {
    field: 'item_referencia',
    headerKey: 'entities.existenciaAlmacen.columns.referencia',
    type: 'text',
  },
  {
    field: 'almacen_nombre',
    headerKey: 'entities.existenciaAlmacen.columns.almacen',
    type: 'text',
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
  {
    field: 'costo_promedio',
    headerKey: 'entities.existenciaAlmacen.columns.costoPromedio',
    type: 'currency',
    width: '130px',
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
