import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CUENTAS_FILTERS_STORAGE_KEY = 'cuentas:filters:v1';
export const CUENTAS_QUICK_SEARCH_FIELD = 'nombre';

export const CUENTA_LIST_PATH = ['contabilidad', 'cuentas'] as const;

/** Endpoints `seleccionar/` de los tres niveles del PUC para la cascada. */
export const CUENTA_CLASE_ENDPOINT = '/contabilidad/cuenta-clase/seleccionar/';
export const CUENTA_GRUPO_ENDPOINT = '/contabilidad/cuenta-grupo/seleccionar/';
export const CUENTA_CUENTA_ENDPOINT = '/contabilidad/cuenta-cuenta/seleccionar/';

/**
 * Rangos de id de la cascada: los grupos de una clase abarcan 10 ids
 * (`clase·10 … +9`); las cuentas de un grupo abarcan 100 (`grupo·100 … +99`).
 */
export const CUENTA_GRUPO_RANGO = { multiplicador: 10, desplazamiento: 9 } as const;
export const CUENTA_CUENTA_RANGO = { multiplicador: 100, desplazamiento: 99 } as const;

export const CUENTAS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.cuenta.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  { field: 'codigo', headerKey: 'entities.cuenta.columns.codigo', type: 'text', width: '110px' },
  { field: 'nombre', headerKey: 'entities.cuenta.columns.nombre', type: 'text' },
  {
    field: 'exige_base',
    headerKey: 'entities.cuenta.columns.exigeBase',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
  {
    field: 'exige_contacto',
    headerKey: 'entities.cuenta.columns.exigeContacto',
    type: 'boolean',
    width: '120px',
    align: 'center',
  },
  {
    field: 'exige_grupo',
    headerKey: 'entities.cuenta.columns.exigeGrupo',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
  {
    field: 'permite_movimiento',
    headerKey: 'entities.cuenta.columns.movimiento',
    type: 'boolean',
    width: '110px',
    align: 'center',
  },
];

export const CUENTAS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'codigo', displayNameKey: 'entities.cuenta.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.cuenta.columns.nombre', type: 'string' },
  {
    name: 'permite_movimiento',
    displayNameKey: 'entities.cuenta.columns.movimiento',
    type: 'boolean',
  },
];

export const CUENTAS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CUENTAS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CUENTAS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
