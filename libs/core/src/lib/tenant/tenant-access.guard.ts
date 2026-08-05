import { inject } from '@angular/core';
import { type CanMatchFn, Router, type Route, type UrlSegment } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AUTH_SERVICE } from '../tokens';
import { ToastService } from '../services/toast.service';
import { TenantService } from './tenant.service';
import { TENANT_ROUTES } from './tenant.types';
import { ContenedorService } from './contenedor.service';
import { tenantSlugFromSegments } from './tenant-slug.utils';

/**
 * Valida que el usuario tenga acceso al contenedor de la URL, y deja el
 * contenedor activo poblado antes de que se monte nada.
 *
 * **Es `canMatch`, no `canActivate`, y eso es esencial.** El router evalúa todos
 * los `canMatch` antes del primer `canActivate`, así que un guard anidado que
 * dependa del contenedor —el de acceso a módulos del ERP, que lee las flags
 * `acceso_*`— corría antes de que este lo poblara. Con el contenedor todavía en
 * `null`, "no hay flags" se lee como "sin restricción" y un módulo fuera del plan
 * se abría por URL directa. Solo en recarga dura: navegando, ya estaba cargado —
 * el mismo link se comportaba distinto según cómo llegaras.
 *
 * Si `currentContenedor` ya coincide con el slug, no revalida (se entró vía la
 * página de contenedores o ya se validó esta sesión). Tras recarga dura es
 * `null` —solo se persiste el slug— así que revalida una vez.
 *
 * **Sin sesión no pide nada**: devuelve `true` sin tocar el backend y deja que
 * `authGuard` (en `canActivate`) redirija al login conservando el `returnUrl`.
 * Pedir accesos para un usuario que va a terminar en el login es una petición
 * que solo puede fallar.
 */
export const tenantAccessGuard: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const router = inject(Router);
  const tenant = inject(TenantService);
  const contenedorService = inject(ContenedorService);
  const toast = inject(ToastService);
  const routes = inject(TENANT_ROUTES);
  const auth = inject(AUTH_SERVICE);

  const slug = tenantSlugFromSegments(route, segments);
  if (!slug) return router.createUrlTree([routes.contenedoresRoot]);

  if (!auth.isAuthenticated()) return true;

  if (tenant.currentContenedor()?.schema_name === slug) {
    tenant.setSlug(slug);
    return true;
  }

  const denegado = () => {
    toast.warn('Sin acceso', 'No tienes acceso a este contenedor.');
    tenant.clear();
    return router.createUrlTree([routes.contenedoresRoot]);
  };

  return contenedorService.getAccesos().pipe(
    map((res) => {
      const match = res.results.find((c) => c.schema_name === slug);
      if (!match) return denegado();
      tenant.setCurrent(match);
      return true;
    }),
    catchError(() => of(router.createUrlTree([routes.contenedoresRoot]))),
  );
};
