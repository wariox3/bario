import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Entrada de almacén**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/inventario/documentos/entrada/`.
 *
 * El `activeDocumentResolver('entrada')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`inventario.routes.ts`) ya cargó `INVENTARIO_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `EntradaFormComponent`; `detalle` muestra la
 * ficha solo lectura (`EntradaDetailComponent`).
 */
export const ENTRADA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('entrada') },
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
          import('./pages/entrada-form/entrada-form.component').then((m) => m.EntradaFormComponent),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —una entrada aprobada ya movió stock— y, si es
        // editable, entrega la cabecera al form (input `documentoEdit`).
        resolve: { documentoEdit: editableDocumentResolver() },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/entrada-form/entrada-form.component').then((m) => m.EntradaFormComponent),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/entrada-detail/entrada-detail.component').then(
            (m) => m.EntradaDetailComponent,
          ),
      },
    ],
  },
];
