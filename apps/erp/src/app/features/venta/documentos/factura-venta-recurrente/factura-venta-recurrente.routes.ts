import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Factura de venta recurrente**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/venta/documentos/factura-venta-recurrente/`.
 *
 * El `activeDocumentResolver('factura-venta-recurrente')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`venta.routes.ts`) ya cargó `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `FacturaVentaRecurrenteFormComponent`;
 * `detalle` muestra la ficha solo lectura (`FacturaVentaRecurrenteDetailComponent`).
 */
export const FACTURA_VENTA_RECURRENTE_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('factura-venta-recurrente') },
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
          import('./pages/factura-venta-recurrente-form/factura-venta-recurrente-form.component').then(
            (m) => m.FacturaVentaRecurrenteFormComponent,
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
          import('./pages/factura-venta-recurrente-form/factura-venta-recurrente-form.component').then(
            (m) => m.FacturaVentaRecurrenteFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/factura-venta-recurrente-detail/factura-venta-recurrente-detail.component').then(
            (m) => m.FacturaVentaRecurrenteDetailComponent,
          ),
      },
    ],
  },
];
