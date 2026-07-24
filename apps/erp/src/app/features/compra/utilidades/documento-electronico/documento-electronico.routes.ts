import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Documento electrónico** del módulo Compra.
 *
 * Utilidad de una sola página (lista). El componente se carga lazy para mantener
 * su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/compra/utilidades/documento-electronico`
 */
export const DOCUMENTO_ELECTRONICO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/documento-electronico-list/documento-electronico-list.component').then(
        (m) => m.DocumentoElectronicoListComponent,
      ),
  },
];
