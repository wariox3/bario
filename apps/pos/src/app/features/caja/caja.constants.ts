import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

/** Filtros del usuario en el listado de cajas, recordados en el dispositivo. */
export const CAJAS_FILTROS_STORAGE_KEY = 'pos:cajas:filtros:v1';

const COL = 'cajas.columns';

export const CAJAS_COLUMNAS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${COL}.id`, type: 'number', width: '70px', align: 'right' },
  { field: 'nombre', headerKey: `${COL}.nombre`, type: 'text' },
  { field: 'placa', headerKey: `${COL}.placa`, type: 'text', width: '140px' },
  { field: 'tipo', headerKey: `${COL}.tipo`, type: 'text' },
  { field: 'ubicacion', headerKey: `${COL}.ubicacion`, type: 'text' },
  { field: 'sede_nombre', headerKey: `${COL}.sede`, type: 'text' },
  {
    field: 'estado_activo',
    headerKey: `${COL}.activo`,
    type: 'boolean',
    width: '80px',
    align: 'center',
  },
];

export const CAJAS_CAMPOS_FILTRO: readonly FilterField[] = [
  { name: 'id', displayNameKey: `${COL}.id`, type: 'number' },
  { name: 'nombre', displayNameKey: `${COL}.nombre`, type: 'string' },
  { name: 'placa', displayNameKey: `${COL}.placa`, type: 'string' },
  { name: 'tipo', displayNameKey: `${COL}.tipo`, type: 'string' },
  { name: 'ubicacion', displayNameKey: `${COL}.ubicacion`, type: 'string' },
  { name: 'estado_activo', displayNameKey: `${COL}.activo`, type: 'boolean' },
];

export const CAJAS_ACCIONES_FILA: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CAJAS_ACCION_PRIMARIA: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

/** Dropdown "Acciones" del toolbar. */
export const CAJAS_ACCIONES_TOOLBAR: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
