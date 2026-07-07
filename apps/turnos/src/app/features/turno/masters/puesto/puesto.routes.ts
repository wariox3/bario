import type { Route } from '@angular/router';

/**
 * Rutas del master Puesto del módulo Turno.
 *
 * Por ahora solo el listado está implementado. Las rutas nuevo/editar/detalle
 * se agregan cuando se construya el formulario de puesto. El componente se
 * carga lazy para mantener el bundle del master por separado.
 *
 * URL: `/t/:tenantSlug/puestos[...]`
 */
export const PUESTO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/puestos-list/puestos-list.component').then((m) => m.PuestosListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/puesto-form/puesto-form.component').then((m) => m.PuestoFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/puesto-form/puesto-form.component').then((m) => m.PuestoFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/puesto-detail/puesto-detail.component').then((m) => m.PuestoDetailComponent),
  },
];
