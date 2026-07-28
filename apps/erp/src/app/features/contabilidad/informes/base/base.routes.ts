import type { Route } from '@angular/router';

/**
 * Rutas del informe **Base** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/base`
 */
export const INFORME_BASE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/base/base.component').then((m) => m.InformeBaseComponent),
  },
];
