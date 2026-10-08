import type { Route } from '@angular/router';

/**
 * Rutas de la **conciliación bancaria**.
 *
 * Master con endpoint propio (camino B): listado, alta/edición y ficha. El
 * formulario de edición es además el banco de trabajo —ahí se cargan los
 * movimientos, se importa el extracto y se concilia—, así que `nuevo` y
 * `editar/:id` comparten componente pero no se ven igual: en alta solo está la
 * cabecera, porque el proceso necesita el id.
 *
 * URL base: `/t/:tenantSlug/contabilidad/utilidades/conciliacion`
 */
export const CONCILIACION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/conciliaciones-list/conciliaciones-list.component').then(
        (m) => m.ConciliacionesListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/conciliacion-form/conciliacion-form.component').then(
        (m) => m.ConciliacionFormComponent,
      ),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/conciliacion-form/conciliacion-form.component').then(
        (m) => m.ConciliacionFormComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/conciliacion-detail/conciliacion-detail.component').then(
        (m) => m.ConciliacionDetailComponent,
      ),
  },
];
