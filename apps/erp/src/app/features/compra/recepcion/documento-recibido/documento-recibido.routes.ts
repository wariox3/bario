import type { Route } from '@angular/router';

/**
 * Rutas de **Documentos recibidos** (Compra › Recepción).
 *
 * URL: `/t/:tenantSlug/compra/recepcion/documentos`; la ficha, en
 * `detalle/:id?cue=&fecha=` (ver `DocumentoRecibidoService.obtener`).
 */
export const DOCUMENTO_RECIBIDO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/documentos-recibidos-list/documentos-recibidos-list.component').then(
        (m) => m.DocumentosRecibidosListComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/documento-recibido-detail/documento-recibido-detail.component').then(
        (m) => m.DocumentoRecibidoDetailComponent,
      ),
  },
];
