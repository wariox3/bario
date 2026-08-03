import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Nota débito de venta**.
 *
 * Este documento aporta solo su config y sus rutas: las páginas las pone la
 * familia de notas de venta (`documentos/_shared/nota/`), que comparte con la
 * nota crédito. Lo único que los distingue es el `documento_tipo` del config.
 *
 * El `activeDocumentResolver('nota-debito')` deja la config en
 * `ModuleNavigationStore` (y la inyecta como `document` por herencia a los hijos)
 * antes de montar la lista — el módulo padre (`venta.routes.ts`) ya cargó
 * `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `NotaDocumentoFormComponent`; `detalle` muestra
 * la ficha solo lectura (`NotaDocumentoDetailComponent`).
 */
export const NOTA_DEBITO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nota-debito') },
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
          import('../_shared/nota/pages/nota-documento-form/nota-documento-form.component').then(
            (m) => m.NotaDocumentoFormComponent,
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
          import('../_shared/nota/pages/nota-documento-form/nota-documento-form.component').then(
            (m) => m.NotaDocumentoFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('../_shared/nota/pages/nota-documento-detail/nota-documento-detail.component').then(
            (m) => m.NotaDocumentoDetailComponent,
          ),
      },
    ],
  },
];
