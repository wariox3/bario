import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Nota ajuste**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/compra/documentos/nota-ajuste/`.
 *
 * El `activeDocumentResolver('nota-ajuste')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`compra.routes.ts`) ya cargó `COMPRA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `NotaAjusteFormComponent`; `detalle` muestra
 * la ficha solo lectura (`NotaAjusteDetailComponent`).
 */
export const NOTA_AJUSTE_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nota-ajuste') },
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
          import('./pages/nota-ajuste-form/nota-ajuste-form.component').then(
            (m) => m.NotaAjusteFormComponent,
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
          import('./pages/nota-ajuste-form/nota-ajuste-form.component').then(
            (m) => m.NotaAjusteFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/nota-ajuste-detail/nota-ajuste-detail.component').then(
            (m) => m.NotaAjusteDetailComponent,
          ),
      },
    ],
  },
];
