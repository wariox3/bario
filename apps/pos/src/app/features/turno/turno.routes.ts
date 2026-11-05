import type { Route } from '@angular/router';

export const TURNO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/turno/turno.component').then((m) => m.TurnoComponent),
  },
];
