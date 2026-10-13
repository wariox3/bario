import type { Route } from '@angular/router';
import { DOCUMENTO_ELECTRONICO_CONFIG } from './documento-electronico.config';

/**
 * Rutas de la utilidad **Documento electrónico** del módulo Compra: la pantalla
 * compartida de emisión con la configuración de compra.
 *
 * URL: `/t/:tenantSlug/compra/utilidades/documento-electronico`
 */
export const DOCUMENTO_ELECTRONICO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('@erp/core/documento-electronico/components/emitir-documento-electronico/emitir-documento-electronico.component').then(
        (m) => m.EmitirDocumentoElectronicoComponent,
      ),
    data: { config: DOCUMENTO_ELECTRONICO_CONFIG },
  },
];
