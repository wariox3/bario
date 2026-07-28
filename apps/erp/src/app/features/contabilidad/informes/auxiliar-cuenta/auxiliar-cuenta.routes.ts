import type { Route } from '@angular/router';

/**
 * Rutas del informe **Auxiliar de cuenta** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/auxiliar-cuenta`
 */
export const AUXILIAR_CUENTA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auxiliar-cuenta/auxiliar-cuenta.component').then(
        (m) => m.AuxiliarCuentaComponent,
      ),
  },
];
