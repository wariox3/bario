import type { Route } from '@angular/router';
import { activeDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Saldo inicial**, montadas por Cartera y por Tesorería. El resolver
 * toma la config del módulo activo, y de ahí sale el tipo de documento.
 *
 * URL: `/t/:tenantSlug/<cartera|tesoreria>/saldo-inicial/list`
 */
export const SALDO_INICIAL_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('saldo-inicial') },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      {
        path: 'list',
        loadComponent: () =>
          import('@erp/core/module-config/components/base-document-list/base-document-list.component').then(
            (m) => m.BaseDocumentListComponent,
          ),
      },
    ],
  },
];
