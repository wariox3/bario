import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const SECUENCIAS_FILTERS_STORAGE_KEY = 'secuencias:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo.
 */
export const SECUENCIAS_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const SECUENCIA_LIST_PATH = ['secuencias'] as const;

/** Días del mes (1..31). El nombre del control es `dia_<n>`. */
export const SECUENCIA_MONTH_DAYS: readonly number[] = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Días de semana + festivos del patrón. `control` es el nombre del FormControl
 * y campo del payload; `labelKey` resuelve el label i18n.
 */
export const SECUENCIA_WEEKDAYS: readonly {
  readonly control: string;
  readonly labelKey: string;
}[] = [
  { control: 'lunes', labelKey: 'entities.secuencia.form.fields.lunes' },
  { control: 'martes', labelKey: 'entities.secuencia.form.fields.martes' },
  { control: 'miercoles', labelKey: 'entities.secuencia.form.fields.miercoles' },
  { control: 'jueves', labelKey: 'entities.secuencia.form.fields.jueves' },
  { control: 'viernes', labelKey: 'entities.secuencia.form.fields.viernes' },
  { control: 'sabado', labelKey: 'entities.secuencia.form.fields.sabado' },
  { control: 'domingo', labelKey: 'entities.secuencia.form.fields.domingo' },
  { control: 'festivo', labelKey: 'entities.secuencia.form.fields.festivo' },
  { control: 'domingo_festivo', labelKey: 'entities.secuencia.form.fields.domingoFestivo' },
];

/**
 * Columnas visibles del listado (resumen). Los campos por día (`dia_1..dia_31`)
 * y por día de semana (`lunes..domingo`, `festivo`, `domingo_festivo`) se omiten
 * en la tabla por volumen; vivirán en el formulario/detalle.
 */
export const SECUENCIAS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.secuencia.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'nombre', headerKey: 'entities.secuencia.columns.nombre', type: 'text' },
  { field: 'dias', headerKey: 'entities.secuencia.columns.dias', type: 'number', align: 'right' },
  {
    field: 'homologar',
    headerKey: 'entities.secuencia.columns.homologar',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
  {
    field: 'estado_inactivo',
    headerKey: 'entities.secuencia.columns.estado',
    type: 'boolean',
    width: '90px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 * El `type` determina qué operadores ofrece el modal.
 */
export const SECUENCIAS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.secuencia.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.secuencia.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.secuencia.columns.nombre', type: 'string' },
  { name: 'horas', displayNameKey: 'entities.secuencia.columns.horas', type: 'number' },
  { name: 'dias', displayNameKey: 'entities.secuencia.columns.dias', type: 'number' },
  { name: 'homologar', displayNameKey: 'entities.secuencia.columns.homologar', type: 'boolean' },
  {
    name: 'estado_inactivo',
    displayNameKey: 'entities.secuencia.columns.estado',
    type: 'boolean',
  },
];

export const SECUENCIAS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const SECUENCIAS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const SECUENCIAS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
