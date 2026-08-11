import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import { MODULE_ACCESS_PREFIX } from '@erp/core/permissions';

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

/** Orden fijo de columnas de la matriz: las cuatro acciones estándar de Django. */
export const ACCIONES_PERMISO = ['view', 'add', 'change', 'delete'] as const;
export type AccionColumna = (typeof ACCIONES_PERMISO)[number];

/**
 * Accesos por módulo que se pueden otorgar al invitar.
 *
 * El `id` es a la vez la clave i18n (`seguridad.usuarios.invitar.accesos.flags.<id>`)
 * y el sufijo de la flag que viaja al backend (`acceso_<id>`). El orden es el
 * del topbar del ERP; `turno` va al final porque no es un módulo del ERP sino
 * la app hermana de turnos.
 *
 * `general` no está: es el módulo base, no se contrata ni se otorga.
 */
export const INVITACION_ACCESOS: readonly InvitacionAcceso[] = [
  { id: 'venta', iconClass: 'pi pi-tag' },
  { id: 'compra', iconClass: 'pi pi-shopping-cart' },
  { id: 'tesoreria', iconClass: 'pi pi-wallet' },
  { id: 'cartera', iconClass: 'pi pi-credit-card' },
  { id: 'inventario', iconClass: 'pi pi-box' },
  { id: 'humano', iconClass: 'pi pi-users' },
  { id: 'contabilidad', iconClass: 'pi pi-calculator' },
  { id: 'turno', iconClass: 'pi pi-clock' },
] as const;

export interface InvitacionAcceso {
  readonly id: InvitacionAccesoId;
  readonly iconClass: string;
}

export type InvitacionAccesoId =
  | 'venta'
  | 'compra'
  | 'tesoreria'
  | 'cartera'
  | 'inventario'
  | 'humano'
  | 'contabilidad'
  | 'turno';

/** Nombre de la flag que espera el backend para un acceso del catálogo. */
export const accesoFlag = (id: InvitacionAccesoId): AccesoFlagName =>
  `${MODULE_ACCESS_PREFIX}${id}`;

export type AccesoFlagName = `${typeof MODULE_ACCESS_PREFIX}${InvitacionAccesoId}`;

export const SEGURIDAD_USUARIOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'usuario_nombre_corto',
    headerKey: 'seguridad.usuarios.columns.nombre',
    type: 'text',
  },
  { field: 'usuario_email', headerKey: 'seguridad.usuarios.columns.correo', type: 'text' },
  {
    field: 'propietario',
    headerKey: 'seguridad.usuarios.columns.propietario',
    type: 'boolean',
    booleanKeyPrefix: 'seguridad.usuarios.propietarioBadge',
    width: '160px',
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
  {
    name: 'propietario',
    displayNameKey: 'seguridad.usuarios.columns.propietario',
    type: 'boolean',
  },
];

/**
 * ¿La fila **no** es la del propietario? Al propietario no se lo saca de acá y
 * su detalle no se gestiona: sin ojo, sin click de fila y sin checkbox.
 */
export const noEsPropietario = (row: unknown): boolean =>
  (row as { propietario?: boolean }).propietario !== true;

export const SEGURIDAD_USUARIOS_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: 'view',
    labelKey: 'common.actions.view',
    iconClass: 'pi pi-eye',
    inline: true,
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
