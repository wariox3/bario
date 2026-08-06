import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import { CONTENEDOR_ROL } from '@erp/core/permissions';

/** Segmentos de ruta de la sección, relativos al tenant. */
export const SEGURIDAD_USUARIOS_PATH = ['seguridad', 'usuarios'] as const;

export const SEGURIDAD_USUARIOS_FILTERS_STORAGE_KEY = 'seguridad:usuarios:filters:v1';

/**
 * Query param de la búsqueda rápida sobre `lista-cliente/`.
 *
 * SUPUESTO: el `SearchFilter` genérico de DRF (`?search=`), que es el que ya
 * usa `/seguridad/usuario/seleccionar/`. Si el backend expone otro nombre, se
 * cambia acá y nada más.
 */
export const SEGURIDAD_USUARIOS_SEARCH_PARAM = 'search';

/**
 * Exportación a Excel del listado.
 *
 * SUPUESTO pendiente de confirmar con backend: se sigue la convención del ERP
 * (`POST …/excel/` con `{filtros}`) sobre el recurso del schema público, más el
 * `cliente_id` que ese recurso exige para acotar al contenedor.
 */
export const SEGURIDAD_USUARIOS_EXPORT_URL = '/seguridad/usuario-cliente/excel/';

/** Clave i18n del rol por id, para cuando el backend no manda `rol_nombre`. */
export const ROL_LABEL_KEY_BY_ID: Readonly<
  Record<number, 'propietario' | 'administrador' | 'usuario'>
> = {
  [CONTENEDOR_ROL.propietario]: 'propietario',
  [CONTENEDOR_ROL.administrador]: 'administrador',
  [CONTENEDOR_ROL.usuario]: 'usuario',
};

/**
 * Roles que se pueden **asignar** desde esta pantalla.
 *
 * "Propietario" queda afuera a propósito: transferir la propiedad del
 * contenedor no es cambiarle el rol a alguien, y el backend todavía no expone
 * esa operación.
 */
export const ROLES_ASIGNABLES: readonly number[] = [
  CONTENEDOR_ROL.administrador,
  CONTENEDOR_ROL.usuario,
];

export const SEGURIDAD_USUARIOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'usuario_nombre_corto',
    headerKey: 'seguridad.usuarios.columns.nombre',
    type: 'text',
  },
  { field: 'usuario_email', headerKey: 'seguridad.usuarios.columns.correo', type: 'text' },
  {
    field: 'rol_nombre',
    headerKey: 'seguridad.usuarios.columns.rol',
    type: 'text',
    width: '200px',
  },
];

/**
 * Campos del constructor de filtros. Se resuelven **en el backend**: viajan
 * como query params de `lista-cliente/` (ver `usuariosQueryParams`), así que
 * los nombres son los del backend, no los de la fila pintada.
 */
export const SEGURIDAD_USUARIOS_FILTER_FIELDS: readonly FilterField[] = [
  {
    name: 'usuario_nombre_corto',
    displayNameKey: 'seguridad.usuarios.columns.nombre',
    type: 'string',
  },
  { name: 'usuario_email', displayNameKey: 'seguridad.usuarios.columns.correo', type: 'string' },
  { name: 'rol_nombre', displayNameKey: 'seguridad.usuarios.columns.rol', type: 'string' },
];

/**
 * ¿La fila es la del propietario? Su rol no se cambia, no se lo saca de acá y
 * su detalle no se gestiona: sin ojo, sin click de fila y sin checkbox.
 */
export const noEsPropietario = (row: unknown): boolean =>
  (row as { rol_id?: number | null }).rol_id !== CONTENEDOR_ROL.propietario;

export const SEGURIDAD_USUARIOS_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: 'view',
    labelKey: 'common.actions.view',
    iconClass: 'pi pi-eye',
    inline: true,
    visibleFor: noEsPropietario,
  },
  {
    id: 'rol',
    labelKey: 'seguridad.usuarios.actions.cambiarRol',
    iconClass: 'pi pi-shield',
    visibleFor: noEsPropietario,
  },
  {
    id: 'delete',
    labelKey: 'common.actions.delete',
    iconClass: 'pi pi-trash',
    severity: 'danger',
    visibleFor: noEsPropietario,
  },
];

export const SEGURIDAD_USUARIOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'invite',
  labelKey: 'seguridad.usuarios.actions.invitar',
  iconClass: 'pi pi-user-plus',
};

export const SEGURIDAD_USUARIOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
