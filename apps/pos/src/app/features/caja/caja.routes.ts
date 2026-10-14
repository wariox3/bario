import type { Route } from '@angular/router';

export const CAJA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/caja/caja.component').then((m) => m.CajaComponent),
  },
];
