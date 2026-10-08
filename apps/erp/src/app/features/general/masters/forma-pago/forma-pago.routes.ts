import type { Route } from '@angular/router';

export const FORMA_PAGO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/formas-pago-list/formas-pago-list.component').then(
        (m) => m.FormasPagoListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/forma-pago-form/forma-pago-form.component').then(
        (m) => m.FormaPagoFormComponent,
      ),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/forma-pago-form/forma-pago-form.component').then(
        (m) => m.FormaPagoFormComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/forma-pago-detail/forma-pago-detail.component').then(
        (m) => m.FormaPagoDetailComponent,
      ),
  },
];
