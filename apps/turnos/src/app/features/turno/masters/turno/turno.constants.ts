import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const TURNOS_FILTERS_STORAGE_KEY = 'turnos:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo.
 */
export const TURNOS_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const TURNO_LIST_PATH = ['turnos'] as const;

/**
 * Columnas visibles del listado. `hora_inicio`/`hora_fin` y `color` se muestran
 * como texto (la tabla no tiene tipo time/color); el color enseña el hex.
 */
export const TURNOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.turno.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'codigo', headerKey: 'entities.turno.columns.codigo', type: 'text' },
  { field: 'nombre', headerKey: 'entities.turno.columns.nombre', type: 'text' },
  { field: 'hora_inicio', headerKey: 'entities.turno.columns.horaInicio', type: 'text' },
  { field: 'hora_fin', headerKey: 'entities.turno.columns.horaFin', type: 'text' },
  { field: 'horas', headerKey: 'entities.turno.columns.horas', type: 'number', align: 'right' },
  {
    field: 'horas_diurnas',
    headerKey: 'entities.turno.columns.horasDiurnas',
    type: 'number',
    align: 'right',
  },
  {
    field: 'horas_nocturnas',
    headerKey: 'entities.turno.columns.horasNocturnas',
    type: 'number',
    align: 'right',
  },
  {
    field: 'descanso',
    headerKey: 'entities.turno.columns.descanso',
    type: 'boolean',
    width: '90px',
    align: 'center',
  },
  {
    field: 'estado_inactivo',
    headerKey: 'entities.turno.columns.estado',
    type: 'boolean',
    width: '90px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 * El `type` determina qué operadores ofrece el modal.
 */
export const TURNOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.turno.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.turno.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.turno.columns.nombre', type: 'string' },
  { name: 'hora_inicio', displayNameKey: 'entities.turno.columns.horaInicio', type: 'string' },
  { name: 'hora_fin', displayNameKey: 'entities.turno.columns.horaFin', type: 'string' },
  { name: 'horas', displayNameKey: 'entities.turno.columns.horas', type: 'number' },
  { name: 'horas_diurnas', displayNameKey: 'entities.turno.columns.horasDiurnas', type: 'number' },
  {
    name: 'horas_nocturnas',
    displayNameKey: 'entities.turno.columns.horasNocturnas',
    type: 'number',
  },
  { name: 'descanso', displayNameKey: 'entities.turno.columns.descanso', type: 'boolean' },
  { name: 'estado_inactivo', displayNameKey: 'entities.turno.columns.estado', type: 'boolean' },
];

export const TURNOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const TURNOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const TURNOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
