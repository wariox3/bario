import type { Route } from '@angular/router';
import { activeDocumentResolver, editableDocumentResolver } from '@erp/core/module-config';

/**
 * Rutas de **Pedido servicio** (documento de venta).
 *
 * Expone `list`, `nuevo` y `editar/:id`. El
 * `activeDocumentResolver('pedido-servicio')` deja la config en
 * `ModuleNavigationStore` (y la inyecta como `document` por herencia a los
 * hijos) antes de montar cualquier página — el módulo padre (`venta.routes.ts`)
 * ya cargó `VENTA_CONFIG`. La lista usa el `BaseDocumentListComponent`; el alta
 * y la edición comparten el `ServicioDocumentoFormComponent` (compartido por
 * todos los documentos de servicio), parametrizado por la config inyectada.
 */
export const PEDIDO_SERVICIO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('pedido-servicio') },
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
          import('../_shared/servicio/pages/servicio-documento-form/servicio-documento-form.component').then(
            (m) => m.ServicioDocumentoFormComponent,
          ),
      },
      {
        path: 'editar/:id',
        // Puerta de edición: bloquea (redirige) si `canEditRow` declara el
        // documento no editable —p. ej. aprobado, incluso por URL directa— y, si
        // es editable, entrega la cabecera al form (input `documentoEdit`) para
        // que no la vuelva a pedir.
        resolve: { documentoEdit: editableDocumentResolver() },
        loadComponent: () =>
          import('../_shared/servicio/pages/servicio-documento-form/servicio-documento-form.component').then(
            (m) => m.ServicioDocumentoFormComponent,
          ),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('../_shared/servicio/pages/servicio-documento-detail/servicio-documento-detail.component').then(
            (m) => m.ServicioDocumentoDetailComponent,
          ),
      },
    ],
  },
];
