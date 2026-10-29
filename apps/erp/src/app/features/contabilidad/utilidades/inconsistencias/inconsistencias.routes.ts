import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Inconsistencias** del módulo Contabilidad.
 *
 * Una única página. El componente se carga lazy para mantener su bundle
 * separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/utilidades/inconsistencias`
 */
export const INCONSISTENCIAS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inconsistencias/inconsistencias.component').then(
        (m) => m.InconsistenciasComponent,
      ),
  },
];
