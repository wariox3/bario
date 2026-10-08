import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Egreso**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en `features/tesoreria/documentos/egreso/`.
 *
 * El `activeDocumentResolver('egreso')` deja la config en `ModuleNavigationStore`
 * antes de montar cada página — el módulo padre (`tesoreria.routes.ts`) ya cargó
 * `TESORERIA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `EgresoFormComponent`; `detalle` monta la ficha
 * de solo lectura (`EgresoDetailComponent`).
 */
export const EGRESO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('egreso') },
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
          import('./pages/egreso-form/egreso-form.component').then((m) => m.EgresoFormComponent),
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
          import('./pages/egreso-form/egreso-form.component').then((m) => m.EgresoFormComponent),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/egreso-detail/egreso-detail.component').then(
            (m) => m.EgresoDetailComponent,
          ),
      },
    ],
  },
];
