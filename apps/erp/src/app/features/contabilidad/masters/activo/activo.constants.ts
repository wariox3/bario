import { type ColumnDef, type FilterField, SELECT_ENDPOINTS } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import { IMPORT_MASTERS_ALL } from '@erp/core/components/import-dialog/import-masters.constant';
import type { ImportMaster } from '@erp/core/components/import-dialog/import-dialog.types';

export const ACTIVOS_FILTERS_STORAGE_KEY = 'activos:filters:v1';
export const ACTIVOS_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const ACTIVO_LIST_PATH = ['contabilidad', 'activos'] as const;

/** Endpoints de los selectores FK (convención de guion del backend nuevo). */
export const ACTIVO_GRUPO_ENDPOINT = '/contabilidad/activo-grupo/seleccionar/';
export const METODO_DEPRECIACION_ENDPOINT = '/contabilidad/metodo-depreciacion/seleccionar/';
export const CENTRO_COSTO_ENDPOINT = SELECT_ENDPOINTS.centroCosto;

export const ACTIVOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.activo.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'codigo',
    headerKey: 'entities.activo.columns.codigo',
    type: 'text',
  },
  {
    field: 'nombre',
    headerKey: 'entities.activo.columns.nombre',
    type: 'text',
  },
  {
    field: 'activo_grupo_nombre',
    headerKey: 'entities.activo.columns.activoGrupo',
    type: 'text',
  },
  {
    field: 'centro_costo_nombre',
    headerKey: 'entities.activo.columns.centroCosto',
    type: 'text',
  },
  {
    field: 'valor_compra',
    headerKey: 'entities.activo.columns.valorCompra',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'fecha_compra',
    headerKey: 'entities.activo.columns.fechaCompra',
    type: 'date',
  },
];

export const ACTIVOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.activo.columns.id', type: 'number' },
  { name: 'codigo', displayNameKey: 'entities.activo.columns.codigo', type: 'string' },
  { name: 'nombre', displayNameKey: 'entities.activo.columns.nombre', type: 'string' },
  { name: 'valor_compra', displayNameKey: 'entities.activo.columns.valorCompra', type: 'number' },
  { name: 'fecha_compra', displayNameKey: 'entities.activo.columns.fechaCompra', type: 'date' },
];

export const ACTIVOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const ACTIVOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const ACTIVOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
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

/**
 * Maestros del archivo de activos: las dos FK del activo que son catálogo
 * **global**. El centro de costo no entra — es del tenant, así que no hay XLSX
 * público que consultar.
 */
export const ACTIVOS_IMPORT_MASTERS: readonly ImportMaster[] = IMPORT_MASTERS_ALL;
