import type { Route } from '@angular/router';

/** Error de configuración al proteger una ruta. */
export class ProtectedRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtectedRouteError';
  }
}

/** Motivo del rechazo; decide qué texto muestra la pantalla. */
export type AccessDeniedVariant = 'permiso' | 'modulo';

/** Clave del `data` de ruta donde viaja el motivo hasta la pantalla. */
export const ACCESS_DENIED_VARIANT_KEY = 'accessDeniedVariant';

/**
 * Ruta **gemela** de una protegida: mismo `path`, renderiza el acceso denegado.
 *
 * Es la mitad que hace que la URL sobreviva al rechazo. El guard de la ruta real
 * usa `canMatch`, así que al rechazar no cancela la navegación sino que deja al
 * router seguir buscando; esta gemela, declarada justo detrás con el mismo path,
 * es lo que encuentra. Misma URL, y el chunk lazy de la real sin descargar.
 *
 * El `**` interno cubre las sub-rutas (`contactos/12/editar`), que si no caerían
 * al comodín de la app y terminarían fuera del tenant.
 */
export function accessDeniedTwin(
  path: string,
  variant: AccessDeniedVariant,
  resolve?: Route['resolve'],
): Route {
  return {
    path,
    resolve,
    children: [
      {
        path: '**',
        data: { [ACCESS_DENIED_VARIANT_KEY]: variant },
        loadComponent: () =>
          import('../components/access-denied/access-denied.page').then(
            (m) => m.AccessDeniedPageComponent,
          ),
      },
    ],
  };
}

/**
 * Valida que la ruta pueda tener gemela. Sin `path` concreto no hay qué repetir,
 * y con comodín la gemela taparía todo lo que venga después.
 *
 * @throws {ProtectedRouteError}
 */
export function assertTwinnablePath(path: string | undefined, context: string): string {
  if (path === undefined) {
    throw new ProtectedRouteError(
      `${context} necesita una ruta con "path" para construir su gemela de acceso denegado.`,
    );
  }
  if (path.includes('**')) {
    throw new ProtectedRouteError(
      `${context} no aplica a rutas comodín ("${path}"): la gemela taparía todo lo que venga después.`,
    );
  }
  return path;
}
