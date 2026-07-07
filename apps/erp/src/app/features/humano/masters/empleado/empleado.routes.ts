import type { Route } from '@angular/router';

/**
 * Rutas del master Empleado (módulo Humano). Empleado es un contacto con
 * `empleado=true`; las páginas reutilizan `ContactoService`.
 */
export const EMPLEADO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/empleados-list/empleados-list.component').then(
        (m) => m.EmpleadosListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/empleado-form/empleado-form.component').then((m) => m.EmpleadoFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/empleado-form/empleado-form.component').then((m) => m.EmpleadoFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/empleado-detail/empleado-detail.component').then(
        (m) => m.EmpleadoDetailComponent,
      ),
  },
];
