import type { ColumnDef, FilterField } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

export const EXISTENCIA_FILTERS_STORAGE_KEY = 'existencia:filters:v1';

/**
 * Columnas del informe, en el orden del informe original: identificación del
 * ítem (id, código, nombre, referencia) y sus saldos de inventario.
 *
 * **La tabla no ordena.** `excel/` no acepta `ordenamientos`, así que dejar la
 * cabecera ordenable haría que la pantalla y el archivo descargado salieran en
 * órdenes distintos sin que nadie lo avise.
 */
export const EXISTENCIA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.existencia.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'codigo',
    headerKey: 'entities.existencia.columns.codigo',
    type: 'text',
    width: '140px',
  },
  {
    field: 'nombre',
    headerKey: 'entities.existencia.columns.nombre',
    type: 'text',
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
  // Dos banderas que el informe ya devolvía y no se pintaban. Cierran la fila:
  // un saldo en negativo o un ítem inactivo con existencia son justo lo que se
  // busca al revisar el inventario.
  {
    field: 'negativo',
    headerKey: 'entities.existencia.columns.negativo',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
  {
    field: 'inactivo',
    headerKey: 'entities.existencia.columns.inactivo',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar. Son los descriptivos del ítem; los saldos
 * quedan fuera por ser calculados.
 *
 * Ya no se declara `inventario`: acotar a los ítems que manejan inventario lo
 * hace el propio informe en el backend, no un filtro base del front.
 */
export const EXISTENCIA_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.existencia.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.existencia.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.existencia.columns.nombre', type: 'string' },
  { name: 'referencia', displayNameKey: 'entities.existencia.columns.referencia', type: 'string' },
  { name: 'negativo', displayNameKey: 'entities.existencia.columns.negativo', type: 'boolean' },
  { name: 'inactivo', displayNameKey: 'entities.existencia.columns.inactivo', type: 'boolean' },
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
