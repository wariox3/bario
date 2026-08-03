import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Cierre contable**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, modal, form y detalle viven juntos en
 * `features/contabilidad/documentos/cierre/`.
 *
 * El `activeDocumentResolver('cierre')` deja la config en `ModuleNavigationStore`
 * antes de montar cada página — el módulo padre (`contabilidad.routes.ts`) ya
 * cargó `CONTABILIDAD_CONFIG`.
 *
 * Sin `unsavedChangesGuard`: las líneas no se editan en el formulario (las genera
 * el backend y se persisten al instante), así que no hay trabajo sin guardar que
 * perder al salir.
 */
export const CIERRE_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('cierre') },
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
          import('./pages/cierre-form/cierre-form.component').then((m) => m.CierreFormComponent),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —un cierre aprobado ya movió los saldos del
        // ejercicio, incluso por URL directa— y, si es editable, entrega la
        // cabecera al form (input `documentoEdit`).
        resolve: { documentoEdit: editableDocumentResolver() },
        loadComponent: () =>
          import('./pages/cierre-form/cierre-form.component').then((m) => m.CierreFormComponent),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/cierre-detail/cierre-detail.component').then(
            (m) => m.CierreDetailComponent,
          ),
      },
    ],
  },
];
