import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CONTACTOS_FILTERS_STORAGE_KEY = 'contactos:filters:v1';

/**
 * Campo sobre el que opera la búsqueda rápida del toolbar (input de texto).
 * El término escrito se convierte en un filtro `contiene` sobre este campo y
 * viaja junto a los filtros avanzados (ver `quickSearchCondition`).
 */
export const CONTACTOS_QUICK_SEARCH_FIELD = 'nombre_corto';

/** IDs del catálogo `tipo_persona` del backend. */
export const TIPO_PERSONA = {
  JURIDICA: 1,
  NATURAL: 2,
} as const;

/**
 * Segmento de ruta del listado, relativo al módulo activo. El módulo se antepone
 * en runtime (`currentModuleId`) para que el master sea agnóstico (general/venta…).
 */
export const CONTACTO_LIST_PATH = ['contactos'] as const;

export const CONTACTOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.contacto.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'identificacion_abreviatura',
    headerKey: 'entities.contacto.columns.identificacion_abreviatura',
    type: 'text',
    width: '80px',
  },
  {
    field: 'numero_identificacion',
    headerKey: 'entities.contacto.columns.identificacion',
    type: 'text',
  },
  {
    field: 'nombre_corto',
    headerKey: 'entities.contacto.columns.nombre',
    type: 'text',
  },
  { field: 'correo', headerKey: 'entities.contacto.columns.correo', type: 'text' },
  { field: 'celular', headerKey: 'entities.contacto.columns.celular', type: 'text' },
  {
    field: 'cliente',
    headerKey: 'entities.contacto.columns.cliente',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
  {
    field: 'proveedor',
    headerKey: 'entities.contacto.columns.proveedor',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
  {
    field: 'empleado',
    headerKey: 'entities.contacto.columns.empleado',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
];

/**
 * Campos por los que se puede filtrar el listado (constructor de filtros).
 *
 * Reutilizan las mismas claves i18n que las columnas como label visible. El
 * `type` determina qué operadores ofrece el modal (ver `FILTER_OPERATORS`).
 */
export const CONTACTOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.contacto.columns.id', type: 'number' },
  {
    name: 'numero_identificacion',
    displayNameKey: 'entities.contacto.columns.identificacion',
    type: 'string',
  },
  { name: 'nombre_corto', displayNameKey: 'entities.contacto.columns.nombre', type: 'string' },
  { name: 'correo', displayNameKey: 'entities.contacto.columns.correo', type: 'string' },
  { name: 'celular', displayNameKey: 'entities.contacto.columns.celular', type: 'string' },
  { name: 'cliente', displayNameKey: 'entities.contacto.columns.cliente', type: 'boolean' },
  { name: 'proveedor', displayNameKey: 'entities.contacto.columns.proveedor', type: 'boolean' },
  { name: 'empleado', displayNameKey: 'entities.contacto.columns.empleado', type: 'boolean' },
];

export const CONTACTOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CONTACTOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CONTACTOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
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
