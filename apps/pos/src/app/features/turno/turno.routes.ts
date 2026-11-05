import type { Route } from '@angular/router';

/** Turnos de caja (movimiento). URL: `/t/:tenantSlug/turno[/detalle/:id]`. */
export const TURNO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/turnos-list/turnos-list.component').then((m) => m.TurnosListComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/turno-detail/turno-detail.component').then((m) => m.TurnoDetailComponent),
  },
];
