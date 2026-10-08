import type { Route } from '@angular/router';
import { activeDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Nómina** (tipo 14).
 *
 * Documento de solo lectura: únicamente `list` y `detalle/:id`. No se declaran
 * `nuevo` ni `editar` porque el documento lo emite el proceso de liquidación
 * —su config los apaga con `canCreate`/`canEdit` en false—, así que esas URLs
 * ni siquiera existen.
 *
 * El `activeDocumentResolver('nomina')` deja la config en
 * `ModuleNavigationStore` (y la inyecta como `document` por herencia a los
 * hijos) antes de montar la lista; el módulo padre (`humano.routes.ts`) ya cargó
 * `HUMANO_CONFIG`.
 */
export const NOMINA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nomina') },
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
          import('./pages/nomina-detail/nomina-detail.component').then(
            (m) => m.NominaDetailComponent,
          ),
      },
    ],
  },
];
