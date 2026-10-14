import type { Route } from '@angular/router';
import type { PosNavKey } from '../layouts/workspace-layout/workspace-menu';

/** Ruta de una sección todavía sin construir: monta el marcador con su título. */
function proximamente(seccion: PosNavKey): Route {
  return {
    path: seccion,
    data: { seccion },
    loadComponent: () =>
      import('../shared/proximamente/proximamente.component').then((m) => m.ProximamenteComponent),
  };
}

/**
 * Rutas del workspace del POS, relativas a `/t/:tenantSlug`.
 *
 * Por ahora las tres secciones son marcadores: la caja y la configuración llegan
 * en el sprint 1, el historial en el 4 (ver `docs/architecture/pos-migracion-sprints.md`).
 */
export const POS_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'caja' },
  proximamente('caja'),
  proximamente('historial'),
  proximamente('configuracion'),
];
