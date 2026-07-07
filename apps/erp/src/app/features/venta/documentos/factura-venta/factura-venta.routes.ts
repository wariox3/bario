import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Factura electrónica de venta**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, columnas, form y detalle viven juntos en
 * `features/venta/documentos/factura-venta/`. Esto permite agregar un
 * documento nuevo (nota crédito, nota débito, etc.) creando otra carpeta
 * hermana sin tocar este archivo.
 *
 * El `activeDocumentResolver('factura-venta')` deja la config en
 * `ModuleNavigationStore` antes de montar la lista — el módulo padre
 * (`venta.routes.ts`) ya cargó `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `FacturaVentaFormComponent` (cabecera
 * específica de la factura de venta); `detalle` muestra la ficha solo lectura
 * (`FacturaVentaDetailComponent`).
 */
export const FACTURA_VENTA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('factura-venta') },
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
          import('./pages/factura-venta-form/factura-venta-form.component').then(
            (m) => m.FacturaVentaFormComponent,
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
          import('./pages/factura-venta-form/factura-venta-form.component').then(
            (m) => m.FacturaVentaFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/factura-venta-detail/factura-venta-detail.component').then(
            (m) => m.FacturaVentaDetailComponent,
          ),
      },
    ],
  },
];
