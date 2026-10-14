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
 * El historial sigue como marcador hasta el sprint 4 (ver
 * `docs/architecture/pos-migracion-sprints.md`).
 */
export const POS_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'caja' },
  {
    path: 'caja',
    loadChildren: () => import('./caja/caja.routes').then((m) => m.CAJA_ROUTES),
  },
  proximamente('historial'),
  {
    path: 'configuracion',
    loadChildren: () =>
      import('./configuracion/configuracion.routes').then((m) => m.CONFIGURACION_ROUTES),
  },
];
