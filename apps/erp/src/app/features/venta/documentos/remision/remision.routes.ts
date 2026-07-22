import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Remisión**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, columnas, form y detalle viven juntos en
 * `features/venta/documentos/remision/`.
 *
 * El `activeDocumentResolver('remision')` deja la config en
 * `ModuleNavigationStore` antes de montar la lista — el módulo padre
 * (`venta.routes.ts`) ya cargó `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `RemisionFormComponent` (cabecera específica de
 * la remisión); `detalle` muestra la ficha solo lectura (`RemisionDetailComponent`).
 */
export const REMISION_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('remision') },
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
          import('./pages/remision-form/remision-form.component').then(
            (m) => m.RemisionFormComponent,
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
          import('./pages/remision-form/remision-form.component').then(
            (m) => m.RemisionFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/remision-detail/remision-detail.component').then(
            (m) => m.RemisionDetailComponent,
          ),
      },
    ],
  },
];
