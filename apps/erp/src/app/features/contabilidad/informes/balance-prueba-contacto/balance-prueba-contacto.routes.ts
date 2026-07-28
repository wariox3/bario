import type { Route } from '@angular/router';

/**
 * Rutas del informe **Balance de prueba por contacto** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/balance-prueba-contacto`
 */
export const BALANCE_PRUEBA_CONTACTO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/balance-prueba-contacto/balance-prueba-contacto.component').then(
        (m) => m.BalancePruebaContactoComponent,
      ),
  },
];
