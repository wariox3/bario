import type { Route } from '@angular/router';

/**
 * Rutas del informe **Auxiliar general** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/auxiliar-general`
 */
export const AUXILIAR_GENERAL_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auxiliar-general/auxiliar-general.component').then(
        (m) => m.AuxiliarGeneralComponent,
      ),
  },
];
