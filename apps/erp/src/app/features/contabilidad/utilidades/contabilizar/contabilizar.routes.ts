import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Contabilizar** del módulo Contabilidad.
 *
 * Una única página. El componente se carga lazy para mantener su bundle
 * separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/utilidades/contabilizar`
 */
export const CONTABILIZAR_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/contabilizar/contabilizar.component').then((m) => m.ContabilizarComponent),
  },
];
