import { InjectionToken } from '@angular/core';

export type TenantSlug = string;

export const LAST_TENANT_KEY = 'reddoc-last-tenant';

export interface ContenedorAccess {
  schema_name: string;
  nombre: string;
  activo: boolean;
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
