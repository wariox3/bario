import { type ColumnDef, type FilterField, SELECT_ENDPOINTS } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CUENTAS_BANCO_FILTERS_STORAGE_KEY = 'cuentas-banco:filters:v1';
export const CUENTAS_BANCO_QUICK_SEARCH_FIELD = 'nombre';

/** Segmento de ruta del listado, relativo al módulo activo (se antepone en runtime). */
export const CUENTA_BANCO_LIST_PATH = ['cuentas-banco'] as const;

/**
 * Id del tipo "caja" (efectivo). Para este tipo el backend no espera número de
 * cuenta ni clase de cuenta: ambos campos se ocultan y se envían en `null`.
 * Valor heredado del legacy (hardcodeado como `3`); confirmar contra el catálogo
 * de `cuenta-banco-tipo` si cambiara.
 */
export const CUENTA_BANCO_TIPO_CAJA = 3;

/** Endpoints de los selectores FK. */
export const CUENTA_BANCO_TIPO_ENDPOINT = '/general/cuenta-banco-tipo/seleccionar/';
export const CUENTA_BANCO_CLASE_ENDPOINT = SELECT_ENDPOINTS.cuentaBancoClase;

export const CUENTAS_BANCO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.cuentaBanco.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'nombre',
    headerKey: 'entities.cuentaBanco.columns.nombre',
    type: 'text',
  },
  {
    field: 'cuenta_banco_tipo_nombre',
    headerKey: 'entities.cuentaBanco.columns.tipo',
    type: 'text',
  },
  {
    field: 'cuenta_banco_clase_nombre',
    headerKey: 'entities.cuentaBanco.columns.clase',
    type: 'text',
  },
  {
    field: 'numero_cuenta',
    headerKey: 'entities.cuentaBanco.columns.numeroCuenta',
    type: 'text',
  },
];

export const CUENTAS_BANCO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.cuentaBanco.columns.id', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.cuentaBanco.columns.nombre', type: 'string' },
  {
    name: 'numero_cuenta',
    displayNameKey: 'entities.cuentaBanco.columns.numeroCuenta',
    type: 'string',
  },
];

export const CUENTAS_BANCO_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CUENTAS_BANCO_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CUENTAS_BANCO_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
