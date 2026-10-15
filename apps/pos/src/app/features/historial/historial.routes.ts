import type { Route } from '@angular/router';

export const HISTORIAL_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/historial/historial.component').then((m) => m.HistorialComponent),
  },
];
