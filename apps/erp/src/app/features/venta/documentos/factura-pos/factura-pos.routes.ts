import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Factura POS** (punto de venta).
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, columnas, form y detalle viven juntos en
 * `features/venta/documentos/factura-pos/`.
 *
 * El `activeDocumentResolver('factura-pos')` deja la config en
 * `ModuleNavigationStore` antes de montar la lista — el módulo padre
 * (`venta.routes.ts`) ya cargó `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `FacturaPosFormComponent` (cabecera + pagos);
 * `detalle` muestra la ficha solo lectura (`FacturaPosDetailComponent`).
 */
export const FACTURA_POS_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('factura-pos') },
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
          import('./pages/factura-pos-form/factura-pos-form.component').then(
            (m) => m.FacturaPosFormComponent,
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
          import('./pages/factura-pos-form/factura-pos-form.component').then(
            (m) => m.FacturaPosFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/factura-pos-detail/factura-pos-detail.component').then(
            (m) => m.FacturaPosDetailComponent,
          ),
      },
    ],
  },
];
