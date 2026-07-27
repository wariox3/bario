import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';
import { unsavedChangesGuard } from '@erp/core/guards/unsaved-changes.guard';

/**
 * Rutas de **Traslado entre almacenes**.
 *
 * Este documento aporta solo su config, sus constantes y sus rutas: las páginas
 * las pone la familia de movimientos (`documentos/_shared/movimiento/`), que
 * comparte con la entrada y la salida. Lo que lo distingue es el
 * `documento_tipo` del config y que sus líneas declaran el sentido del
 * movimiento (`usaOperacionInventario`).
 *
 * El `activeDocumentResolver('traslado')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`inventario.routes.ts`) ya cargó `INVENTARIO_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `MovimientoDocumentoFormComponent`; `detalle`
 * muestra la ficha solo lectura (`MovimientoDocumentoDetailComponent`).
 */
export const TRASLADO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('traslado') },
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
          import('../_shared/movimiento/pages/movimiento-documento-form/movimiento-documento-form.component').then(
            (m) => m.MovimientoDocumentoFormComponent,
          ),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —un traslado aprobado ya movió stock— y, si es
        // editable, entrega la cabecera al form (input `documentoEdit`).
        resolve: { documentoEdit: editableDocumentResolver() },
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('../_shared/movimiento/pages/movimiento-documento-form/movimiento-documento-form.component').then(
            (m) => m.MovimientoDocumentoFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('../_shared/movimiento/pages/movimiento-documento-detail/movimiento-documento-detail.component').then(
            (m) => m.MovimientoDocumentoDetailComponent,
          ),
      },
    ],
  },
];
