import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Nota débito de compra**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/compra/documentos/nota-debito-compra/`.
 *
 * El `activeDocumentResolver('nota-debito-compra')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`compra.routes.ts`) ya cargó `COMPRA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `NotaDebitoCompraFormComponent`; `detalle`
 * muestra la ficha solo lectura (`NotaDebitoCompraDetailComponent`).
 */
export const NOTA_DEBITO_COMPRA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nota-debito-compra') },
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
        path: 'nuevo',
        loadComponent: () =>
          import('./pages/nota-debito-compra-form/nota-debito-compra-form.component').then(
            (m) => m.NotaDebitoCompraFormComponent,
          ),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —p. ej. aprobado, incluso por URL directa— y, si
        // es editable, entrega la cabecera al form (input `documentoEdit`).
        resolve: { documentoEdit: editableDocumentResolver() },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/nota-debito-compra-form/nota-debito-compra-form.component').then(
            (m) => m.NotaDebitoCompraFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/nota-debito-compra-detail/nota-debito-compra-detail.component').then(
            (m) => m.NotaDebitoCompraDetailComponent,
          ),
      },
    ],
  },
];
