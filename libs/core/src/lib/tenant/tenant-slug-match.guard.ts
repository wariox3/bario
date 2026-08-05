import { inject } from '@angular/core';
import type { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { TenantService } from './tenant.service';
import { tenantSlugFromSegments } from './tenant-slug.utils';

/**
 * Fija el tenant activo **durante el matching**, no al activar.
 *
 * El slug sale de la URL, así que se puede saber antes que cualquier otra cosa —
 * y hace falta que así sea. El router evalúa **todos** los `canMatch` (de arriba
 * hacia abajo) antes del primer `canActivate`, de modo que un guard `canMatch`
 * anidado —el de permisos del ERP, que consulta al backend— corre antes de que
 * un `canActivate` alcance a marcar el tenant. Su petición saldría sin la
 * cabecera `X-Tenant`, el backend la resolvería contra el schema público y
 * respondería 404. Solo pasa en recarga dura: navegando, el tenant ya estaba.
 *
 * Es la mitad **sincrónica y barata** del par: dice *quién* es el tenant. Quién
 * valida que puedas entrar —y quién puebla el contenedor con sus flags— es
 * `tenantAccessGuard`, que corre después en el mismo `canMatch`.
 *
 * Siempre deja pasar: no valida nada.
 *
 * ```ts
 * { path: 't/:tenantSlug', canMatch: [tenantSlugMatchGuard, tenantAccessGuard] }
 * ```
 */
export const tenantSlugMatchGuard: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const slug = tenantSlugFromSegments(route, segments);
  if (slug) inject(TenantService).setSlug(slug);
  return true;
};
