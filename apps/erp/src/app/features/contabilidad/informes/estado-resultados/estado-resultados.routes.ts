import type { Route } from '@angular/router';

/**
 * Rutas del informe **Estado de resultados** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/estado-resultados`
 */
export const ESTADO_RESULTADOS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/estado-resultados/estado-resultados.component').then(
        (m) => m.EstadoResultadosComponent,
      ),
  },
];
