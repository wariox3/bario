import type { ColumnDef, FilterField, SortSpec } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { Exogena } from './exogena.model';

export const EXOGENA_FILTERS_STORAGE_KEY = 'exogena:filters:v1';

/** Segmentos de ruta del listado, relativos al tenant. */
export const EXOGENA_LIST_PATH = ['contabilidad', 'exogena'] as const;

/** `lista/` no garantiza orden propio: se pide de la más reciente a la más antigua. */
export const EXOGENA_ORDEN_DEFECTO: readonly SortSpec[] = [{ field: 'anio', direction: 'desc' }];

/** FK por la que se filtran los formatos de una exógena. */
export const EXOGENA_FORMATO_FILTER_FIELD = 'exogena_id';

export const EXOGENA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.exogena.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  // `text` y no `number`: como número se pintaría con separador de miles (2.025).
  { field: 'anio', headerKey: 'entities.exogena.columns.anio', type: 'text', width: '100px' },
  { field: 'comentario', headerKey: 'entities.exogena.columns.comentario', type: 'text' },
  {
    field: 'estado_generado',
    headerKey: 'entities.exogena.columns.generada',
    type: 'boolean',
  },
  {
    field: 'estado_presentado',
    headerKey: 'entities.exogena.columns.presentada',
    type: 'boolean',
  },
];

export const EXOGENA_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.exogena.columns.id', type: 'number' },
  { name: 'anio', displayNameKey: 'entities.exogena.columns.anio', type: 'number' },
  {
    name: 'estado_generado',
    displayNameKey: 'entities.exogena.columns.generada',
    type: 'boolean',
  },
  {
    name: 'estado_presentado',
    displayNameKey: 'entities.exogena.columns.presentada',
    type: 'boolean',
  },
];

/** Presentada ya no se edita ni se borra: el backend respondería 400. */
const noPresentada = (row: unknown): boolean => !(row as Exogena).estado_presentado;

export const EXOGENA_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: 'edit',
    labelKey: 'common.actions.edit',
    iconClass: 'pi pi-pencil',
    inline: true,
    visibleFor: noPresentada,
  },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  {
    id: 'delete',
    labelKey: 'common.actions.delete',
    iconClass: 'pi pi-trash',
    severity: 'danger',
    visibleFor: noPresentada,
  },
];

export const EXOGENA_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};
