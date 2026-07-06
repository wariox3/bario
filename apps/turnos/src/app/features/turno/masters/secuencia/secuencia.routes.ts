import type { Route } from '@angular/router';

/**
 * Rutas del master Secuencia del módulo Turno.
 *
 * Listado + formulario de alta/edición (la misma página cubre crear y editar) +
 * detalle de solo lectura. Los componentes se cargan lazy para mantener el
 * bundle del master por separado.
 *
 * URL: `/t/:tenantSlug/secuencias[/nuevo|/editar/:id|/detalle/:id]`
 */
export const SECUENCIA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/secuencias-list/secuencias-list.component').then(
        (m) => m.SecuenciasListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/secuencia-form/secuencia-form.component').then(
        (m) => m.SecuenciaFormComponent,
      ),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/secuencia-form/secuencia-form.component').then(
        (m) => m.SecuenciaFormComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/secuencia-detail/secuencia-detail.component').then(
        (m) => m.SecuenciaDetailComponent,
      ),
  },
];
