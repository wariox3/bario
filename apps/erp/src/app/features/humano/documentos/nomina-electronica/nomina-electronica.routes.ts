import type { Route } from '@angular/router';
import { activeDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Nómina electrónica** (tipo 15).
 *
 * Documento de solo lectura: únicamente `list` y `detalle/:id`. No se declaran
 * `nuevo` ni `editar` porque el documento lo fabrica la acción "Generar" del
 * listado —su config los apaga con `canCreate`/`canEdit` en false—, así que esas
 * URLs ni siquiera existen.
 *
 * El `activeDocumentResolver('nomina-electronica')` deja la config en
 * `ModuleNavigationStore` (y la inyecta como `document` por herencia a los
 * hijos) antes de montar la lista; el módulo padre (`humano.routes.ts`) ya cargó
 * `HUMANO_CONFIG`.
 */
export const NOMINA_ELECTRONICA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nomina-electronica') },
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
          import('./pages/nomina-electronica-detail/nomina-electronica-detail.component').then(
            (m) => m.NominaElectronicaDetailComponent,
          ),
      },
    ],
  },
];
