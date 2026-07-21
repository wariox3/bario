import type { Route } from '@angular/router';

/**
 * Rutas del informe **Cuentas por pagar** del módulo Tesorería.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * Se enruta desde Tesorería y también desde General (informe compartido); la
 * página deriva el módulo activo del `ActiveModuleStore` para migas y navegación.
 *
 * URLs: `/t/:tenantSlug/tesoreria/informes/cuenta-pagar` y
 * `/t/:tenantSlug/general/informes/cuenta-pagar`
 */
export const CUENTA_PAGAR_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cuenta-pagar-list/cuenta-pagar-list.component').then(
        (m) => m.CuentaPagarListComponent,
      ),
  },
];
