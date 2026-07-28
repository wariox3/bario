import type { Route } from '@angular/router';

/**
 * Rutas del informe **Estado de situación financiera** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/estado-situacion-financiera`
 */
export const ESTADO_SITUACION_FINANCIERA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/estado-situacion-financiera/estado-situacion-financiera.component').then(
        (m) => m.EstadoSituacionFinancieraComponent,
      ),
  },
];
