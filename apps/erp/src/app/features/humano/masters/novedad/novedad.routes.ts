import type { Route } from '@angular/router';

export const NOVEDAD_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/novedades-list/novedades-list.component').then(
        (m) => m.NovedadesListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/novedad-form/novedad-form.component').then((m) => m.NovedadFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/novedad-form/novedad-form.component').then((m) => m.NovedadFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/novedad-detail/novedad-detail.component').then(
        (m) => m.NovedadDetailComponent,
      ),
  },
];
