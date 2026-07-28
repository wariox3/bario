import type { Route } from '@angular/router';

/**
 * Rutas del informe **Auxiliar por contacto** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/auxiliar-contacto`
 */
export const AUXILIAR_CONTACTO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/auxiliar-contacto/auxiliar-contacto.component').then(
        (m) => m.AuxiliarContactoComponent,
      ),
  },
];
