import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Movimientos** del módulo Contabilidad: los
 * movimientos de saldo inicial, con su importación.
 *
 * URL: `/t/:tenantSlug/contabilidad/utilidades/movimientos`
 */
export const MOVIMIENTO_UTILIDAD_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/movimientos-list/movimientos-list.component').then(
        (m) => m.MovimientosUtilidadListComponent,
      ),
  },
];
