import type { Route } from '@angular/router';

/** Rutas del workspace del POS, relativas a `/t/:tenantSlug`. */
export const POS_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'caja' },
  {
    path: 'caja',
    loadChildren: () => import('./caja/caja.routes').then((m) => m.CAJA_ROUTES),
  },
  {
    path: 'historial',
    loadChildren: () => import('./historial/historial.routes').then((m) => m.HISTORIAL_ROUTES),
  },
  {
    path: 'configuracion',
    loadChildren: () =>
      import('./configuracion/configuracion.routes').then((m) => m.CONFIGURACION_ROUTES),
  },
];
