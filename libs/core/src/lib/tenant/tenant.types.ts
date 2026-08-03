import { InjectionToken } from '@angular/core';

export type TenantSlug = string;

export const LAST_TENANT_KEY = 'reddoc-last-tenant';

/**
 * Subconjunto de `Contenedor` que el tenant activo mantiene en memoria.
 *
 * Todos los productores (`tenantAccessGuard`, `rootRedirectGuard`, la lista de
 * contenedores) alimentan esto con un `Contenedor` completo de
 * `/contenedor/cliente/lista-usuario/`, así que `cliente_id` y `rol_id` siempre
 * vienen: el primero identifica al contenedor en los endpoints del schema
 * público, el segundo dice qué puede administrar el usuario aquí dentro.
 */
export interface ContenedorAccess {
  schema_name: string;
  nombre: string;
  activo: boolean;
  cliente_id: number;
  rol_id: number;
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
