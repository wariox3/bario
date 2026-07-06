import type { Route } from '@angular/router';

export const PROGRAMADOR_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/programadores-list/programadores-list.component').then(
        (m) => m.ProgramadoresListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/programador-form/programador-form.component').then(
        (m) => m.ProgramadorFormComponent,
      ),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/programador-form/programador-form.component').then(
        (m) => m.ProgramadorFormComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/programador-detail/programador-detail.component').then(
        (m) => m.ProgramadorDetailComponent,
      ),
  },
];
