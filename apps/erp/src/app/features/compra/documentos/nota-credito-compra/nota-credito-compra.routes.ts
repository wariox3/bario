import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Nota crédito de compra**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/compra/documentos/nota-credito-compra/`.
 *
 * El `activeDocumentResolver('nota-credito-compra')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`compra.routes.ts`) ya cargó `COMPRA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `NotaCreditoCompraFormComponent`; `detalle`
 * muestra la ficha solo lectura (`NotaCreditoCompraDetailComponent`).
 */
export const NOTA_CREDITO_COMPRA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nota-credito-compra') },
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
          import('./pages/nota-credito-compra-form/nota-credito-compra-form.component').then(
            (m) => m.NotaCreditoCompraFormComponent,
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
          import('./pages/nota-credito-compra-form/nota-credito-compra-form.component').then(
            (m) => m.NotaCreditoCompraFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/nota-credito-compra-detail/nota-credito-compra-detail.component').then(
            (m) => m.NotaCreditoCompraDetailComponent,
          ),
      },
    ],
  },
];
