import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Documento soporte**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, form y detalle viven juntos en
 * `features/compra/documentos/documento-soporte/`.
 *
 * El `activeDocumentResolver('documento-soporte')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`compra.routes.ts`) ya cargó `COMPRA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `DocumentoSoporteFormComponent`; `detalle`
 * muestra la ficha solo lectura (`DocumentoSoporteDetailComponent`).
 */
export const DOCUMENTO_SOPORTE_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('documento-soporte') },
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
          import('./pages/documento-soporte-form/documento-soporte-form.component').then(
            (m) => m.DocumentoSoporteFormComponent,
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
          import('./pages/documento-soporte-form/documento-soporte-form.component').then(
            (m) => m.DocumentoSoporteFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/documento-soporte-detail/documento-soporte-detail.component').then(
            (m) => m.DocumentoSoporteDetailComponent,
          ),
      },
    ],
  },
];
