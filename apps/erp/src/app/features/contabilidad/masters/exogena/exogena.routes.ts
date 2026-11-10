import type { Route } from '@angular/router';

export const EXOGENA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/exogenas-list/exogenas-list.component').then((m) => m.ExogenasListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/exogena-form/exogena-form.component').then((m) => m.ExogenaFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/exogena-form/exogena-form.component').then((m) => m.ExogenaFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/exogena-detail/exogena-detail.component').then(
        (m) => m.ExogenaDetailComponent,
      ),
  },
];
