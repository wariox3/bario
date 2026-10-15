import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import {
  I18nService,
  TenantService,
  ToastService,
  accesoFlag,
  readModuleAccessFlags,
} from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { ROUTE_PATHS } from '../constants/route-paths.constants';

/**
 * El POS vende: la empresa tiene que tener contratado el módulo de **venta**
 * (`acceso_venta` del contenedor). Si no lo tiene, se vuelve a la lista de
 * contenedores con un aviso.
 *
 * Mismo criterio que el acceso a módulos del ERP: un contenedor que no trae
 * ninguna flag `acceso_*` no tiene contra qué filtrarse y pasa. No es seguridad
 * —el backend responde 403 igual—, es no ofrecer una caja que no va a poder
 * facturar.
 *
 * Va como `canActivate` del workspace: corre después de `tenantAccessGuard`, que
 * es el que deja el contenedor en `TenantService`.
 */
export const ventaAccessGuard: CanActivateFn = () => {
  const flags = readModuleAccessFlags(inject(TenantService).currentContenedor());
  if (flags === null || flags.has(accesoFlag('venta'))) return true;

  const tx = inject<I18nService<AppDict>>(I18nService).t().acceso.sinVenta;
  inject(ToastService).warn(tx.title, tx.desc);
  return inject(Router).parseUrl(ROUTE_PATHS.contenedores.root);
};
