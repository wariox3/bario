import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const PUESTOS_FILTERS_STORAGE_KEY = 'puestos:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo.
 */
export const PUESTOS_QUICK_SEARCH_FIELD = 'nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const PUESTO_LIST_PATH = ['puestos'] as const;

/**
 * Columnas visibles del listado. Por ahora solo los campos legibles: los FK
 * crudos (`centro_costo`, `ciudad`, `contacto`, `programador`) se omiten en la
 * tabla; su `<campo>_nombre` solo llega en el getById (usado en form/detalle).
 */
export const PUESTOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.puesto.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  { field: 'contacto', headerKey: 'entities.puesto.columns.contacto', type: 'text' },
  { field: 'contacto_nombre', headerKey: 'entities.puesto.columns.contactoNombre', type: 'text' },
  { field: 'nombre', headerKey: 'entities.puesto.columns.nombre', type: 'text' },
  { field: 'direccion', headerKey: 'entities.puesto.columns.direccion', type: 'text' },
  { field: 'celular', headerKey: 'entities.puesto.columns.celular', type: 'text' },
  { field: 'ciudad_nombre', headerKey: 'entities.puesto.columns.ciudadNombre', type: 'text' },
  { field: 'centro_costo', headerKey: 'entities.puesto.columns.centroCosto', type: 'text' },
  {
    field: 'centro_costo_nombre',
    headerKey: 'entities.puesto.columns.centroCostoNombre',
    type: 'text',
  },
  {
    field: 'estado_inactivo',
    headerKey: 'entities.puesto.columns.estado',
    type: 'boolean',
    width: '90px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 * El `type` determina qué operadores ofrece el modal.
 */
export const PUESTOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.puesto.columns.id', type: 'number' },
  { name: 'nombre', displayNameKey: 'entities.puesto.columns.nombre', type: 'string' },
  { name: 'direccion', displayNameKey: 'entities.puesto.columns.direccion', type: 'string' },
  { name: 'celular', displayNameKey: 'entities.puesto.columns.celular', type: 'string' },
  { name: 'comentario', displayNameKey: 'entities.puesto.columns.comentario', type: 'string' },
  { name: 'estado_inactivo', displayNameKey: 'entities.puesto.columns.estado', type: 'boolean' },
];

export const PUESTOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const PUESTOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const PUESTOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
