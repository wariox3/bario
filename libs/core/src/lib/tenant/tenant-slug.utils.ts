import type { Route, UrlSegment } from '@angular/router';

/** Nombre del parámetro de ruta que lleva el slug, en `t/:tenantSlug`. */
export const TENANT_SLUG_PARAM = ':tenantSlug';

/**
 * Slug del tenant leído de la URL, para guards que corren en la fase de
 * **matching**.
 *
 * Un `CanMatchFn` recibe la `Route` declarada y los segmentos crudos, no un
 * `ActivatedRouteSnapshot`: todavía no hay `paramMap` que consultar. Se ubica el
 * slug cruzando el `path` de la ruta con los segmentos, en vez de hardcodear la
 * posición, para que mover el prefijo (`t/` → `tenant/`) no lo rompa en silencio.
 */
export function tenantSlugFromSegments(
  route: Route,
  segments: readonly UrlSegment[],
): string | null {
  const indice = (route.path ?? '').split('/').indexOf(TENANT_SLUG_PARAM);
  if (indice < 0) return null;
  return segments[indice]?.path ?? null;
}
