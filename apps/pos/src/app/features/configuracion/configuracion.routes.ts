import type { Route } from '@angular/router';

export const CONFIGURACION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/configuracion-caja/configuracion-caja.component').then(
        (m) => m.ConfiguracionCajaComponent,
      ),
  },
];
