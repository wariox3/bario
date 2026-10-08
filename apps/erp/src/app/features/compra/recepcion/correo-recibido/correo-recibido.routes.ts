import type { Route } from '@angular/router';

/**
 * Rutas de **Correos** (Compra › Recepción).
 *
 * URL: `/t/:tenantSlug/compra/recepcion/correos`
 */
export const CORREO_RECIBIDO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/correos-recibidos-list/correos-recibidos-list.component').then(
        (m) => m.CorreosRecibidosListComponent,
      ),
  },
];
