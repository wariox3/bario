import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const EXISTENCIA_FILTERS_STORAGE_KEY = 'existencia:filters:v1';

/**
 * Columnas del informe, en el orden del informe original: identificación del
 * ítem (id, código, nombre, referencia) y sus saldos de inventario.
 *
 * Los saldos son campos calculados por el backend: se muestran pero **no** son
 * ordenables (igual que en el legacy).
 */
export const EXISTENCIA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.existencia.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
    sortable: true,
  },
  {
    field: 'codigo',
    headerKey: 'entities.existencia.columns.codigo',
    type: 'text',
    width: '140px',
    sortable: true,
  },
  {
    field: 'nombre',
    headerKey: 'entities.existencia.columns.nombre',
    type: 'text',
    sortable: true,
  },
  { field: 'referencia', headerKey: 'entities.existencia.columns.referencia', type: 'text' },
  {
    field: 'existencia',
    headerKey: 'entities.existencia.columns.existencia',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'remision',
    headerKey: 'entities.existencia.columns.remision',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'disponible',
    headerKey: 'entities.existencia.columns.disponible',
    type: 'number',
    width: '110px',
    align: 'right',
  },
];

/**
 * Campos por los que se puede filtrar. Son los descriptivos del ítem; los
 * saldos quedan fuera por ser calculados. `inventario` tampoco se ofrece: el
 * informe ya lo fija como filtro implícito (ver `ExistenciaService`).
 */
export const EXISTENCIA_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.existencia.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.existencia.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.existencia.columns.nombre', type: 'string' },
  { name: 'referencia', displayNameKey: 'entities.existencia.columns.referencia', type: 'string' },
];

/**
 * Acciones trailing del toolbar. Al ser un informe de solo lectura, el dropdown
 * "Acciones" solo ofrece descargar el Excel (sin nuevo/importar), igual que el
 * resto de informes (ej. venta-item).
 */
export const EXISTENCIA_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
