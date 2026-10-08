import type { Route } from '@angular/router';
import { activeDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Aporte a seguridad social** (tipo 22).
 *
 * Documento de solo lectura: únicamente `list` y `detalle/:id`. No se declaran
 * `nuevo` ni `editar` porque el documento lo emite el proceso de aporte —su
 * config los apaga con `canCreate`/`canEdit` en false—, así que esas URLs ni
 * siquiera existen.
 *
 * El `activeDocumentResolver('seguridad-social')` deja la config en
 * `ModuleNavigationStore` (y la inyecta como `document` por herencia a los
 * hijos) antes de montar la lista; el módulo padre (`humano.routes.ts`) ya cargó
 * `HUMANO_CONFIG`.
 */
export const SEGURIDAD_SOCIAL_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('seguridad-social') },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      {
        path: 'list',
        loadComponent: () =>
          import('@erp/core/module-config/components/base-document-list/base-document-list.component').then(
            (m) => m.BaseDocumentListComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/seguridad-social-detail/seguridad-social-detail.component').then(
            (m) => m.SeguridadSocialDetailComponent,
          ),
      },
    ],
  },
];
