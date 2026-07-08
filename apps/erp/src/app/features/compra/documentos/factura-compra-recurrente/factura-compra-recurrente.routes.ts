import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Factura de compra recurrente**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/compra/documentos/factura-compra-recurrente/`.
 *
 * El `activeDocumentResolver('factura-compra-recurrente')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`compra.routes.ts`) ya cargó `COMPRA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `FacturaCompraRecurrenteFormComponent`;
 * `detalle` muestra la ficha solo lectura (`FacturaCompraRecurrenteDetailComponent`).
 */
export const FACTURA_COMPRA_RECURRENTE_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('factura-compra-recurrente') },
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
          import('./pages/factura-compra-recurrente-form/factura-compra-recurrente-form.component').then(
            (m) => m.FacturaCompraRecurrenteFormComponent,
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
          import('./pages/factura-compra-recurrente-form/factura-compra-recurrente-form.component').then(
            (m) => m.FacturaCompraRecurrenteFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/factura-compra-recurrente-detail/factura-compra-recurrente-detail.component').then(
            (m) => m.FacturaCompraRecurrenteDetailComponent,
          ),
      },
    ],
  },
];
