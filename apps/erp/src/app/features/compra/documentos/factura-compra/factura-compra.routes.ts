import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Factura de compra**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/compra/documentos/factura-compra/`.
 *
 * El `activeDocumentResolver('factura-compra')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`compra.routes.ts`) ya cargó `COMPRA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `FacturaCompraFormComponent`; `detalle`
 * muestra la ficha solo lectura (`FacturaCompraDetailComponent`).
 */
export const FACTURA_COMPRA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('factura-compra') },
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
          import('./pages/factura-compra-form/factura-compra-form.component').then(
            (m) => m.FacturaCompraFormComponent,
          ),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —p. ej. aprobado, incluso por URL directa— y, si
        // es editable, entrega la cabecera al form (input `documentoEdit`) para
        // que no la vuelva a pedir.
        resolve: { documentoEdit: editableDocumentResolver() },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/factura-compra-form/factura-compra-form.component').then(
            (m) => m.FacturaCompraFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/factura-compra-detail/factura-compra-detail.component').then(
            (m) => m.FacturaCompraDetailComponent,
          ),
      },
    ],
  },
];
