import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AUTH_SERVICE } from '../tokens';
import { TenantService } from './tenant.service';
import { TENANT_ROUTES } from './tenant.types';
import { ContenedorService } from './contenedor.service';

export const rootRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AUTH_SERVICE);
  const tenant = inject(TenantService);
  const contenedorService = inject(ContenedorService);
  const routes = inject(TENANT_ROUTES);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree([routes.login]);
  }

  const lastSlug = tenant.getLastSlug();
  if (!lastSlug) {
    return router.createUrlTree([routes.contenedoresRoot]);
  }

  return contenedorService.getAccesos().pipe(
    map((res) => {
      const match = res.results.find((c) => c.schema_name === lastSlug);
      if (!match) {
        return router.createUrlTree([routes.contenedoresRoot]);
      }
      tenant.setCurrent(match);
      return router.parseUrl(routes.tenantHome(lastSlug));
    }),
    catchError(() => of(router.createUrlTree([routes.contenedoresRoot]))),
  );
};
