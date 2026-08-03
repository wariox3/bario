import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Pedido de cliente**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, columnas, form y detalle viven juntos en
 * `features/venta/documentos/pedido-cliente/`.
 *
 * El `activeDocumentResolver('pedido-cliente')` deja la config en
 * `ModuleNavigationStore` antes de montar la lista — el módulo padre
 * (`venta.routes.ts`) ya cargó `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `PedidoClienteFormComponent` (cabecera mínima);
 * `detalle` muestra la ficha solo lectura (`PedidoClienteDetailComponent`).
 */
export const PEDIDO_CLIENTE_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('pedido-cliente') },
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
          import('./pages/pedido-cliente-form/pedido-cliente-form.component').then(
            (m) => m.PedidoClienteFormComponent,
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
          import('./pages/pedido-cliente-form/pedido-cliente-form.component').then(
            (m) => m.PedidoClienteFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/pedido-cliente-detail/pedido-cliente-detail.component').then(
            (m) => m.PedidoClienteDetailComponent,
          ),
      },
    ],
  },
];
