import type { SeguridadMenuItem } from './seguridad.types';

/**
 * Secciones del menú lateral de Seguridad, en orden de aparición.
 *
 * Hoy solo "Usuarios". Las que vengan (roles, auditoría, sesiones) entran acá
 * más su ruta hija en `SEGURIDAD_ROUTES`; ni el shell ni las secciones ya
 * hechas se tocan.
 */
export const SEGURIDAD_MENU: readonly SeguridadMenuItem[] = [
  {
    id: 'usuarios',
    labelKey: 'seguridad.menu.usuarios',
    iconClass: 'pi pi-users',
    path: 'usuarios',
  },
];
