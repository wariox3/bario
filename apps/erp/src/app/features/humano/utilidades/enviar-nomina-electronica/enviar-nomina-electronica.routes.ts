import type { Route } from '@angular/router';
import { ENVIAR_NOMINA_ELECTRONICA_CONFIG } from './enviar-nomina-electronica.config';

/**
 * Rutas de la utilidad **Enviar nómina electrónica** del módulo Humano: la
 * pantalla compartida de emisión con la configuración de nómina.
 *
 * URL: `/t/:tenantSlug/humano/utilidades/enviar-nomina-electronica`
 */
export const ENVIAR_NOMINA_ELECTRONICA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('@erp/core/documento-electronico/components/emitir-documento-electronico/emitir-documento-electronico.component').then(
        (m) => m.EmitirDocumentoElectronicoComponent,
      ),
    data: { config: ENVIAR_NOMINA_ELECTRONICA_CONFIG },
  },
];
