import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Enviar nómina electrónica** del módulo Humano.
 *
 * Una única página. El componente se carga lazy para mantener su bundle
 * separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/humano/utilidades/enviar-nomina-electronica`
 */
export const ENVIAR_NOMINA_ELECTRONICA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/enviar-nomina-electronica/enviar-nomina-electronica.component').then(
        (m) => m.EnviarNominaElectronicaComponent,
      ),
  },
];
