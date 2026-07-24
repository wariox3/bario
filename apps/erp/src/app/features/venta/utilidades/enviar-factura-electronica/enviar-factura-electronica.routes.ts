import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Enviar factura electrónica** del módulo Venta.
 *
 * Utilidad de una sola página (dos tabs internos). El componente se carga lazy
 * para mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/venta/utilidades/enviar-factura-electronica`
 */
export const ENVIAR_FACTURA_ELECTRONICA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/enviar-factura-electronica/enviar-factura-electronica.component').then(
        (m) => m.EnviarFacturaElectronicaComponent,
      ),
  },
];
