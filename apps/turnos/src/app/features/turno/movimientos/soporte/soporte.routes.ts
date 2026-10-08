import type { Route } from '@angular/router';

/**
 * Rutas del movimiento Soporte del módulo Turno (sección Movimientos).
 *
 * Por ahora solo el listado está implementado. Las rutas nuevo/editar/detalle
 * se agregan cuando se construya el formulario de soporte. El componente se
 * carga lazy para mantener el bundle por separado.
 *
 * URL: `/t/:tenantSlug/soportes[...]`
 */
export const SOPORTE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/soportes-list/soportes-list.component').then((m) => m.SoportesListComponent),
  },
];
