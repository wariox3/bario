import type { Route } from '@angular/router';

/**
 * Rutas del informe **Balance de prueba** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/balance-prueba`
 */
export const BALANCE_PRUEBA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/balance-prueba/balance-prueba.component').then(
        (m) => m.BalancePruebaComponent,
      ),
  },
];
