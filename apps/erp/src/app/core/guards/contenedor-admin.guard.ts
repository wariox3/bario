import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { TenantService } from '@reddoc/core';
import { PermissionsService } from '@erp/core/permissions';

/**
 * Restringe una ruta a quien administra el contenedor (propietario o administrador).
 *
 * Complementa —no reemplaza— el ocultamiento en el user-menu: sin esto, escribir
 * la URL a mano abre igual la pantalla. Corre después de `tenantAccessGuard`
 * (padre de la ruta), así que el contenedor activo con su `rol_id` ya está en
 * memoria incluso tras recarga dura.
 *
 * Quien no califica vuelve a la raíz del tenant en vez de ver un 403: no pidió
 * entrar acá, llegó por una URL que no le corresponde.
 */
export const contenedorAdminGuard: CanActivateFn = () => {
  const permissions = inject(PermissionsService);
  const tenant = inject(TenantService);
  const router = inject(Router);

  if (permissions.isContenedorAdmin()) return true;

  const slug = tenant.currentSlug();
  return router.createUrlTree(slug ? ['/t', slug] : ['/contenedores']);
};
