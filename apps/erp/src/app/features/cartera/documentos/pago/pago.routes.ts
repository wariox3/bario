import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Pago**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en `features/cartera/documentos/pago/`.
 *
 * El `activeDocumentResolver('pago')` deja la config en `ModuleNavigationStore`
 * antes de montar cada página — el módulo padre (`cartera.routes.ts`) ya cargó
 * `CARTERA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `PagoFormComponent`; `detalle` monta la ficha
 * de solo lectura (`PagoDetailComponent`).
 */
export const PAGO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('pago') },
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
          import('./pages/pago-form/pago-form.component').then((m) => m.PagoFormComponent),
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
          import('./pages/pago-form/pago-form.component').then((m) => m.PagoFormComponent),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/pago-detail/pago-detail.component').then((m) => m.PagoDetailComponent),
      },
    ],
  },
];
