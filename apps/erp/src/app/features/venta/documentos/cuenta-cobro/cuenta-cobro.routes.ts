import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Cuenta de cobro** (tipo 17).
 *
 * Este documento aporta solo su config y sus rutas: las páginas las pone la
 * familia POS (`documentos/_shared/pos/`), que comparte con la factura POS y la
 * factura POS electrónica. Lo único que los distingue es el `documento_tipo` del
 * config.
 *
 * El `activeDocumentResolver('cuenta-cobro')` deja la config en
 * `ModuleNavigationStore` (y la inyecta como `document` por herencia a los
 * hijos) antes de montar la lista — el módulo padre (`venta.routes.ts`) ya cargó
 * `VENTA_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `PosDocumentoFormComponent` (cabecera + pagos);
 * `detalle` muestra la ficha solo lectura (`PosDocumentoDetailComponent`).
 */
export const CUENTA_COBRO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('cuenta-cobro') },
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
          import('../_shared/pos/pages/pos-documento-form/pos-documento-form.component').then(
            (m) => m.PosDocumentoFormComponent,
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
          import('../_shared/pos/pages/pos-documento-form/pos-documento-form.component').then(
            (m) => m.PosDocumentoFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('../_shared/pos/pages/pos-documento-detail/pos-documento-detail.component').then(
            (m) => m.PosDocumentoDetailComponent,
          ),
      },
    ],
  },
];
