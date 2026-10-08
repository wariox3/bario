import type { Route } from '@angular/router';

/**
 * Rutas del movimiento Programación del módulo Turno (sección Movimientos).
 *
 * Por ahora solo el listado (placeholder). Las rutas nuevo/editar/detalle se
 * agregan cuando se defina el contenido de la programación. El componente se
 * carga lazy para mantener el bundle por separado.
 *
 * URL: `/t/:tenantSlug/programaciones[...]`
 */
export const PROGRAMACION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/programaciones-list/programaciones-list.component').then(
        (m) => m.ProgramacionesListComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/programacion-detail/programacion-detail.component').then(
        (m) => m.ProgramacionDetailComponent,
      ),
  },
];
