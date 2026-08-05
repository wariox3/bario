import { inject } from '@angular/core';
import type { CanMatchFn, Route } from '@angular/router';
import { PermissionsService } from './permissions.service';

/** Clave bajo la que `withModuleAccess` deja el id del módulo en el `data`. */
export const MODULE_ACCESS_ROUTE_DATA_KEY = 'moduleId';

/**
 * Bloquea el módulo que el plan del contenedor no incluye.
 *
 * `CanMatch` por lo mismo que `permissionGuard`: al no hacer match, el router
 * cae en la gemela de acceso denegado —misma URL— y el bundle del módulo entero
 * no se descarga.
 */
export const moduleAccessGuard: CanMatchFn = (route: Route) => {
  const moduleId = route.data?.[MODULE_ACCESS_ROUTE_DATA_KEY] as string | undefined;
  if (moduleId === undefined) return true;

  return inject(PermissionsService).canAccessModule(moduleId);
};
