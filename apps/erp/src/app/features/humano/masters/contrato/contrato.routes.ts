import type { Route } from '@angular/router';

export const CONTRATO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/contratos-list/contratos-list.component').then(
        (m) => m.ContratosListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/contrato-form/contrato-form.component').then((m) => m.ContratoFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/contrato-form/contrato-form.component').then((m) => m.ContratoFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/contrato-detail/contrato-detail.component').then(
        (m) => m.ContratoDetailComponent,
      ),
  },
];
