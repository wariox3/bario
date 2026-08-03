import type { Route } from '@angular/router';

/**
 * Rutas del master **Almacén** (camino B).
 *
 * URL: `/t/:tenantSlug/inventario/almacenes`. El formulario cubre alta y
 * edición: sin `:id` es alta, con `:id` es edición.
 */
export const ALMACEN_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/almacenes-list/almacenes-list.component').then(
        (m) => m.AlmacenesListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/almacen-form/almacen-form.component').then((m) => m.AlmacenFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/almacen-form/almacen-form.component').then((m) => m.AlmacenFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/almacen-detail/almacen-detail.component').then(
        (m) => m.AlmacenDetailComponent,
      ),
  },
];
