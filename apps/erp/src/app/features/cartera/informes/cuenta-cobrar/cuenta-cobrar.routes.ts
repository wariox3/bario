import type { Route } from '@angular/router';

/**
 * Rutas del informe **Cuentas por cobrar** del módulo Cartera.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * Se enruta desde Cartera y también desde General (informe compartido); la
 * página deriva el módulo activo del `ActiveModuleStore` para migas y navegación.
 *
 * URLs: `/t/:tenantSlug/cartera/informes/cuenta-cobrar` y
 * `/t/:tenantSlug/general/informes/cuenta-cobrar`
 */
export const CUENTA_COBRAR_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cuenta-cobrar-list/cuenta-cobrar-list.component').then(
        (m) => m.CuentaCobrarListComponent,
      ),
  },
];
