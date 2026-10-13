import type { Route } from '@angular/router';

/**
 * Rutas del proceso **Validar depreciación** de Contabilidad.
 *
 * URL: `/t/:tenantSlug/contabilidad/proceso/validar-depreciacion`
 */
export const VALIDAR_DEPRECIACION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/validar-depreciacion/validar-depreciacion.component').then(
        (m) => m.ValidarDepreciacionComponent,
      ),
  },
];
