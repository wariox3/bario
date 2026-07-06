import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { TenantService } from './tenant.service';
import { TENANT_ROUTES } from './tenant.types';
import { ContenedorService } from './contenedor.service';

/**
 * Marca el tenant activo a partir del slug de la URL `/t/:tenantSlug` y **valida** que el
 * usuario tenga acceso al contenedor antes de pintar.
 *
 * Reemplaza al `tenantGuard` de `@reddoc/core` (que confía en el rechazo tardío del backend):
 * sin esto, entrar por URL directa a un tenant ajeno renderiza la pantalla y solo dispara un
 * toast de 403, dejando al usuario atrapado en una URL prohibida.
 *
 * Si `currentContenedor` ya coincide con el slug, no revalida (entró vía la página de
 * contenedores o ya se validó esta sesión). Tras recarga dura `currentContenedor` es null
 * —solo se persiste el slug— así que revalida una vez, que es justo el caso del bug.
 */
export const tenantAccessGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const tenant = inject(TenantService);
  const contenedorService = inject(ContenedorService);
  const toast = inject(ToastService);
  const routes = inject(TENANT_ROUTES);

  const slug = route.paramMap.get('tenantSlug');
  if (!slug) return router.createUrlTree([routes.contenedoresRoot]);

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
