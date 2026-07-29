import type { Route } from '@angular/router';

/**
 * Rutas de la consulta de **movimientos contables**.
 *
 * Una única página de listado, cargada lazy para mantener su bundle separado del
 * resto del módulo.
 *
 * La página deriva el módulo activo del `ActiveModuleStore`, así que podría
 * montarse desde otro módulo sin tocarla.
 *
 * URL: `/t/:tenantSlug/contabilidad/movimientos`
 */
export const MOVIMIENTO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/movimientos-list/movimientos-list.component').then(
        (m) => m.MovimientosListComponent,
      ),
  },
];
