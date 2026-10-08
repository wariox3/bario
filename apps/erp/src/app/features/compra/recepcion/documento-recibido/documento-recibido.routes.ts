import type { Route } from '@angular/router';

/**
 * Rutas de **Documentos recibidos** (Compra › Recepción).
 *
 * URL: `/t/:tenantSlug/compra/recepcion/documentos`
 */
export const DOCUMENTO_RECIBIDO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/documentos-recibidos-list/documentos-recibidos-list.component').then(
        (m) => m.DocumentosRecibidosListComponent,
      ),
  },
];
