import type { Route } from '@angular/router';
import { activeDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Pago**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en `features/cartera/documentos/pago/`.
 *
 * El `activeDocumentResolver('pago')` deja la config en `ModuleNavigationStore`
 * antes de montar la lista — el módulo padre (`cartera.routes.ts`) ya cargó
 * `CARTERA_CONFIG`.
 *
 * Por ahora solo el listado: `nuevo` / `editar` / `detalle` se suman cuando
 * existan sus páginas (sus capabilities están apagadas en `pago.config.ts`).
 */
export const PAGO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('pago') },
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
