import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_PATHS_TOKEN } from '../../tokens';
import { TenantService } from '../tenant.service';

/**
 * Marca el tenant activo a partir del slug de la URL `/t/:tenantSlug`.
 *
 * No valida el acceso ni consulta el backend: la URL es la fuente de verdad y
 * es el backend quien rechaza un tenant ajeno (la cabecera `X-Tenant` resuelve
 * el schema → 403/404 si no corresponde). Validar acá sería redundante y
 * obligaría a una petición extra antes de pintar cada pantalla.
 */
export const tenantGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const tenant = inject(TenantService);
  const routes = inject(ROUTE_PATHS_TOKEN);

  const slug = route.paramMap.get('tenantSlug');
  if (!slug) return router.createUrlTree([routes.dashboard.root]);

  tenant.setSlug(slug);
  return true;
};
