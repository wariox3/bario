import type { Route } from '@angular/router';

export const VENDER_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/vender/vender.component').then((m) => m.VenderComponent),
  },
];
