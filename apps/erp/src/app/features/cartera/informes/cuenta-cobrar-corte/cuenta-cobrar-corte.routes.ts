import type { Route } from '@angular/router';

/**
 * Rutas del informe **Cuentas por cobrar corte** del módulo Cartera.
 *
 * Informe de solo lectura (una página). El componente se carga lazy para
 * mantener su bundle separado del resto del módulo. Module-agnostic: deriva el
 * módulo activo del `ActiveModuleStore` para migas y navegación, por si se
 * comparte con otros módulos más adelante.
 *
 * URL: `/t/:tenantSlug/cartera/informes/cuenta-cobrar-corte`
 */
export const CUENTA_COBRAR_CORTE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cuenta-cobrar-corte-list/cuenta-cobrar-corte-list.component').then(
        (m) => m.CuentaCobrarCorteListComponent,
      ),
  },
];
