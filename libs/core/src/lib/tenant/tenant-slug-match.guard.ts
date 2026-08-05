import { inject } from '@angular/core';
import type { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { TenantService } from './tenant.service';

/** Nombre del parámetro de ruta que lleva el slug, en `t/:tenantSlug`. */
const PARAM = ':tenantSlug';

/**
 * Fija el tenant activo **durante el matching**, no al activar.
 *
 * El slug sale de la URL, así que se puede saber antes que cualquier otra cosa —
 * y hace falta que así sea. El router evalúa **todos** los `canMatch` (de arriba
 * hacia abajo) antes del primer `canActivate`, de modo que un guard `canMatch`
 * anidado —el de permisos del ERP, que consulta al backend— corre antes de que
 * `tenantAccessGuard` alcance a marcar el tenant. Su petición sale sin la
 * cabecera `X-Tenant`, el backend la resuelve contra el schema público y
 * responde 404. Solo pasa en recarga dura: navegando, el tenant ya estaba.
 *
 * Este guard cierra esa ventana. Siempre deja pasar: no valida nada, y quien
 * valida el acceso real sigue siendo `tenantAccessGuard` en su `canActivate`
 * (que además limpia el tenant si el usuario no tiene acceso).
 *
 * Se pone junto a `canActivate` en la ruta `t/:tenantSlug`:
 *
 * ```ts
 * { path: 't/:tenantSlug', canMatch: [tenantSlugMatchGuard], canActivate: [...] }
 * ```
 */
export const tenantSlugMatchGuard: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const slug = slugDeLaUrl(route, segments);
  if (slug) inject(TenantService).setSlug(slug);
  return true;
};

/**
 * Ubica el slug cruzando el `path` declarado por la ruta con los segmentos de la
 * URL. Se deriva la posición en vez de hardcodearla para que mover el prefijo
 * (`t/` → `tenant/`) no rompa esto en silencio.
 */
function slugDeLaUrl(route: Route, segments: UrlSegment[]): string | null {
  const indice = (route.path ?? '').split('/').indexOf(PARAM);
  if (indice < 0) return null;
  return segments[indice]?.path ?? null;
}
