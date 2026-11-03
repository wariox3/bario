import { InjectionToken } from '@angular/core';
import type { ContenedorAccesoFlags } from './contenedor.model';

export type TenantSlug = string;

export const LAST_TENANT_KEY = 'reddoc-last-tenant';

/**
 * Lo que el tenant activo mantiene en memoria del contenedor.
 *
 * Tiene dos productores:
 *  - la lista de contenedores y `rootRedirectGuard`, con la fila completa de
 *    `/contenedor/cliente/lista-usuario/`;
 *  - `tenantAccessGuard` tras una recarga dura, con la membresía de
 *    `/seguridad/usuario-cliente/usuario/`, que no trae `activo` y puede no traer
 *    el nombre ni la imagen.
 *
 * Por eso solo `schema_name`, `cliente_id` y `propietario` son seguros: el
 * primero identifica al tenant, el segundo al contenedor en los endpoints del
 * schema público y el tercero dice si el usuario administra esta empresa.
 *
 * A qué módulos entra el usuario lo deciden `grupos` (más `propietario`,
 * `is_superuser` y `soporte`, que abren todo): ver `readModuleAccessFlags`. Los
 * `acceso_*` heredados ya no los manda ningún endpoint.
 */
export interface ContenedorAccess extends ContenedorAccesoFlags {
  schema_name: string;
  cliente_id: number;
  propietario: boolean;
  soporte?: boolean;
  is_superuser?: boolean;
  /** Grupos de la membresía; deciden los módulos (ver `GRUPO_ACCESO`). */
  grupos?: readonly number[];
  /** Sin él, el header pinta el slug. */
  cliente_nombre?: string | null;
  activo?: boolean;
  /** Miniatura de la imagen de la empresa; sin ella, el header pinta la inicial. */
  cliente_imagen_thumbnail?: string | null;
}

/**
 * Rutas que necesitan los guards de tenant (`tenantAccessGuard`, `rootRedirectGuard`)
 * para redirigir. Cada app las provee según su propio mapa de rutas: así los guards
 * viven en `@reddoc/core` sin acoplarse a las constantes de rutas de ninguna app.
 */
export interface TenantRoutes {
  /** Ruta de la pantalla de selección de contenedor. Ej: `/contenedores`. */
  readonly contenedoresRoot: string;
  /** Ruta de login. Ej: `/auth/login`. */
  readonly login: string;
  /** Constructor de la ruta home del tenant a partir del slug. Ej: `(s) => \`/t/${s}/inicio\``. */
  readonly tenantHome: (slug: string) => string;
}

export const TENANT_ROUTES = new InjectionToken<TenantRoutes>('TenantRoutes');
