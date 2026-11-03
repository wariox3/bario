import { InjectionToken } from '@angular/core';

export type TenantSlug = string;

export const LAST_TENANT_KEY = 'reddoc-last-tenant';

/**
 * Lo que el tenant activo mantiene en memoria del contenedor.
 *
 * Tiene dos productores:
 *  - la lista de contenedores y `rootRedirectGuard`, con la fila completa de
 *    `/contenedor/cliente/lista-usuario/` (`Contenedor` cumple este contrato);
 *  - `tenantAccessGuard` tras una recarga dura, con la membresía de
 *    `/seguridad/usuario-cliente/usuario/` (ver `membresiaToAccess`), que no trae
 *    `activo` y todavía no trae el nombre ni la imagen.
 *
 * `grupos` es obligatorio porque las dos fuentes lo mandan y decide a qué
 * módulos entra el usuario (ver `readModuleAccessFlags`): una fila sin él
 * abriría todo en silencio.
 */
export interface ContenedorAccess {
  readonly schema_name: string;
  readonly cliente_id: number;
  readonly propietario: boolean;
  /** Grupos de la membresía; deciden los módulos (ver `GRUPO_ACCESO`). */
  readonly grupos: readonly number[];
  readonly soporte?: boolean;
  readonly is_superuser?: boolean;
  /** Sin él, el header pinta el slug. */
  readonly cliente_nombre?: string | null;
  readonly activo?: boolean;
  /** Miniatura de la imagen de la empresa; sin ella, el header pinta la inicial. */
  readonly cliente_imagen_thumbnail?: string | null;
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
