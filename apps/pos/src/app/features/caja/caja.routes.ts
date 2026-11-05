import type { Route } from '@angular/router';

/** Administrador de cajas. URL: `/t/:tenantSlug/caja[...]`. */
export const CAJA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cajas-list/cajas-list.component').then((m) => m.CajasListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/caja-form/caja-form.component').then((m) => m.CajaFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/caja-form/caja-form.component').then((m) => m.CajaFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/caja-detail/caja-detail.component').then((m) => m.CajaDetailComponent),
  },
];
