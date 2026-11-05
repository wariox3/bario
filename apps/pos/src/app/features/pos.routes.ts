import type { Route } from '@angular/router';

/** Rutas del workspace del POS, relativas a `/t/:tenantSlug`. */
export const POS_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'vender' },
  {
    path: 'vender',
    loadChildren: () => import('./vender/vender.routes').then((m) => m.VENDER_ROUTES),
  },
  {
    path: 'caja',
    loadChildren: () => import('./caja/caja.routes').then((m) => m.CAJA_ROUTES),
  },
  {
    path: 'turno',
    loadChildren: () => import('./turno/turno.routes').then((m) => m.TURNO_ROUTES),
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
