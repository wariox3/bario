import type { Route } from '@angular/router';

/**
 * Rutas del proceso **Validar créditos** de Humano.
 *
 * URL: `/t/:tenantSlug/humano/proceso/validar-creditos`
 */
export const VALIDAR_CREDITOS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/validar-creditos/validar-creditos.component').then(
        (m) => m.ValidarCreditosComponent,
      ),
  },
];
