import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Depreciación**.
 *
 * Cada documento del módulo es un bounded context auto-contenido: su config,
 * constantes, tabla de líneas, form y detalle viven juntos en
 * `features/contabilidad/documentos/depreciacion/`.
 *
 * El `activeDocumentResolver('depreciacion')` deja la config en
 * `ModuleNavigationStore` antes de montar cada página — el módulo padre
 * (`contabilidad.routes.ts`) ya cargó `CONTABILIDAD_CONFIG`.
 *
 * `nuevo` / `editar` comparten el `DepreciacionFormComponent`; `detalle` monta
 * la ficha de solo lectura (`DepreciacionDetailComponent`).
 *
 * Sin `unsavedChangesGuard`: las líneas no se editan en el formulario (las
 * genera el backend y se persisten al instante), así que no hay trabajo sin
 * guardar que perder al salir.
 */
export const DEPRECIACION_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('depreciacion') },
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
          import('./pages/depreciacion-form/depreciacion-form.component').then(
            (m) => m.DepreciacionFormComponent,
          ),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —una depreciación aprobada ya movió saldos,
        // incluso por URL directa— y, si es editable, entrega la cabecera al
        // form (input `documentoEdit`) para que no la vuelva a pedir.
        resolve: { documentoEdit: editableDocumentResolver() },
        loadComponent: () =>
          import('./pages/depreciacion-form/depreciacion-form.component').then(
            (m) => m.DepreciacionFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/depreciacion-detail/depreciacion-detail.component').then(
            (m) => m.DepreciacionDetailComponent,
          ),
      },
    ],
  },
];
