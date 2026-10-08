import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Asiento contable**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/contabilidad/documentos/asiento/`.
 *
 * El `activeDocumentResolver('asiento')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`contabilidad.routes.ts`) ya cargó `CONTABILIDAD_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `AsientoFormComponent`; `detalle` monta la
 * ficha de solo lectura (`AsientoDetailComponent`).
 */
export const ASIENTO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('asiento') },
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
          import('./pages/asiento-form/asiento-form.component').then((m) => m.AsientoFormComponent),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —un asiento aprobado ya movió saldos, incluso por
        // URL directa— y, si es editable, entrega la cabecera al form (input
        // `documentoEdit`) para que no la vuelva a pedir.
        resolve: { documentoEdit: editableDocumentResolver() },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/asiento-form/asiento-form.component').then((m) => m.AsientoFormComponent),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/asiento-detail/asiento-detail.component').then(
            (m) => m.AsientoDetailComponent,
          ),
      },
    ],
  },
];
