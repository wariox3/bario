import type { Route } from '@angular/router';
import { accessDeniedTwin, assertTwinnablePath } from './access-denied-route';
import { PERMISSION_ROUTE_DATA_KEY, permissionGuard } from './permission.guard';
import type { ModeloId } from './modelo.catalog';

/**
 * Protege una ruta con el modelo del backend que la gobierna, devolviendo el
 * **par** de rutas que hay que montar en su lugar:
 *
 *  1. La ruta real, con `permissionGuard` en `canMatch`.
 *  2. Su gemela de acceso denegado (ver `accessDeniedTwin`).
 *
 * Uso, dentro del `children` de un `<modulo>.routes.ts` — ojo con el spread:
 *
 * ```ts
 * ...withPermission(MODELO.general.contacto, {
 *   path: 'contactos',
 *   loadChildren: () => import('...').then((m) => m.CONTACTO_ROUTES),
 * }),
 * ```
 *
 * Es el eje **permisos del usuario**. Para el eje plan del tenant (qué módulos
 * contrató la empresa) es `withModuleAccess`.
 *
 * @throws {ProtectedRouteError} si la ruta no declara `path`, o si es comodín.
 */
export function withPermission(modelo: ModeloId, route: Route): Route[] {
  const path = assertTwinnablePath(route.path, `withPermission(${modelo})`);

  return [
    {
      ...route,
      canMatch: [...(route.canMatch ?? []), permissionGuard],
      data: { ...route.data, [PERMISSION_ROUTE_DATA_KEY]: modelo },
    },
    accessDeniedTwin(path, 'permiso'),
  ];
}
