import type { Route } from '@angular/router';
import { erpModuleResolver } from '@erp/core/erp-modules';
import { accessDeniedTwin, assertTwinnablePath } from './access-denied-route';
import { MODULE_ACCESS_ROUTE_DATA_KEY, moduleAccessGuard } from './module-access.guard';

/**
 * Protege un módulo entero con la flag `acceso_*` de su plan, devolviendo el
 * par de rutas (real + gemela de acceso denegado), igual que `withPermission`.
 *
 * Uso, en `app.routes.ts` bajo `/t/:tenantSlug`:
 *
 * ```ts
 * ...withModuleAccess('venta', {
 *   path: 'venta',
 *   loadChildren: () => import('./features/venta/venta.routes').then((m) => m.VENTA_ROUTES),
 * }),
 * ```
 *
 * La gemela limpia el módulo activo (`erpModuleResolver(null)`): sin eso, el
 * sidebar seguiría mostrando el menú del módulo anterior junto a un cartel que
 * dice que este no está disponible. Un módulo que no es tuyo no aporta menú.
 *
 * Es el eje **plan del tenant**. Para el de permisos del usuario dentro de un
 * módulo que sí tenés, es `withPermission`.
 *
 * @throws {ProtectedRouteError} si la ruta no declara `path`, o si es comodín.
 */
export function withModuleAccess(moduleId: string, route: Route): Route[] {
  const path = assertTwinnablePath(route.path, `withModuleAccess("${moduleId}")`);

  return [
    {
      ...route,
      canMatch: [...(route.canMatch ?? []), moduleAccessGuard],
      data: { ...route.data, [MODULE_ACCESS_ROUTE_DATA_KEY]: moduleId },
    },
    accessDeniedTwin(path, 'modulo', { _module: erpModuleResolver(null) }),
  ];
}
