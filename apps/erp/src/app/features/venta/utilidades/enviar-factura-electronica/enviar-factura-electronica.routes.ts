import type { Route } from '@angular/router';
import { ENVIAR_FACTURA_ELECTRONICA_CONFIG } from './enviar-factura-electronica.config';

/**
 * Rutas de la utilidad **Enviar factura electrónica** del módulo Venta: la
 * pantalla compartida de emisión con la configuración de facturas.
 *
 * URL: `/t/:tenantSlug/venta/utilidades/enviar-factura-electronica`
 */
export const ENVIAR_FACTURA_ELECTRONICA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('@erp/core/documento-electronico/components/emitir-documento-electronico/emitir-documento-electronico.component').then(
        (m) => m.EmitirDocumentoElectronicoComponent,
      ),
    data: { config: ENVIAR_FACTURA_ELECTRONICA_CONFIG },
  },
];
