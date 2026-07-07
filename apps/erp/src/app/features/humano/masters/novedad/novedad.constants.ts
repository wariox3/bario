import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const NOVEDADES_FILTERS_STORAGE_KEY = 'novedades:filters:v1';
export const NOVEDADES_QUICK_SEARCH_FIELD = 'contrato_nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const NOVEDAD_LIST_PATH = ['humano', 'novedades'] as const;

// El endpoint del selector de tipo de novedad es cross-form (novedad + turno);
// vive en `SELECT_ENDPOINTS.novedadTipo` (`@reddoc/core`).
/** Endpoint del selector de novedad de referencia (filtrado por contrato + tipo). */
export const NOVEDAD_REFERENCIA_ENDPOINT = '/humano/novedad/seleccionar/';

/**
 * Ids del catálogo `novedad_tipo` que disparan lógica condicional en el formulario.
 *
 * ⚠️ Acoplados al catálogo global del backend (igual que `CONTRATO_TIPO_INDEFINIDO_ID`).
 * Centralizados acá para que un cambio sea de una sola línea. Si el backend llegara
 * a exponer un código semántico estable, reemplazar el discriminador en `novedad.rules`.
 */
export const NOVEDAD_TIPO_VACACIONES_ID = 7;
export const NOVEDAD_TIPO_REFERENCIA_ID = 1;

/**
 * Nombres de los parámetros de filtro del selector de novedad de referencia.
 * ⚠️ A confirmar contra el backend (el legacy usaba `contrato_id` / `novedad_tipo_id`).
 */
export const NOVEDAD_REFERENCIA_CONTRATO_PARAM = 'contrato';
export const NOVEDAD_REFERENCIA_TIPO_PARAM = 'novedad_tipo';

export const NOVEDADES_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'novedad_tipo_nombre',
    headerKey: 'entities.novedad.columns.novedadTipo',
    type: 'text',
  },
  {
    field: 'contrato_nombre',
    headerKey: 'entities.novedad.columns.contrato',
    type: 'text',
  },
  {
    field: 'fecha_desde',
    headerKey: 'entities.novedad.columns.fechaDesde',
    type: 'date',
  },
  {
    field: 'fecha_hasta',
    headerKey: 'entities.novedad.columns.fechaHasta',
    type: 'date',
  },
  {
    field: 'dias',
    headerKey: 'entities.novedad.columns.dias',
    type: 'number',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.novedad.columns.total',
    type: 'currency',
    align: 'right',
  },
];

export const NOVEDADES_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'contrato_nombre', displayNameKey: 'entities.novedad.columns.contrato', type: 'string' },
  {
    name: 'novedad_tipo_nombre',
    displayNameKey: 'entities.novedad.columns.novedadTipo',
    type: 'string',
  },
  { name: 'fecha_desde', displayNameKey: 'entities.novedad.columns.fechaDesde', type: 'date' },
  { name: 'fecha_hasta', displayNameKey: 'entities.novedad.columns.fechaHasta', type: 'date' },
];

export const NOVEDADES_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const NOVEDADES_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const NOVEDADES_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
