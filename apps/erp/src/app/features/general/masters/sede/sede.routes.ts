import type { Route } from '@angular/router';

export const SEDE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/sedes-list/sedes-list.component').then((m) => m.SedesListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/sede-form/sede-form.component').then((m) => m.SedeFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/sede-form/sede-form.component').then((m) => m.SedeFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/sede-detail/sede-detail.component').then((m) => m.SedeDetailComponent),
  },
];
