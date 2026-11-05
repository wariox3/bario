import type { Route } from '@angular/router';

/** Turnos de caja (movimiento). URL: `/t/:tenantSlug/turno`. */
export const TURNO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/turnos-list/turnos-list.component').then((m) => m.TurnosListComponent),
  },
];
