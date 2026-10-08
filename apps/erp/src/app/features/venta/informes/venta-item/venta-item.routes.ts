import type { Route } from '@angular/router';

/**
 * Rutas del informe **Ventas por ítem** del módulo Venta.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * Se enruta desde Venta y también desde General (informe compartido); la página
 * deriva el módulo activo del `ActiveModuleStore` para migas y navegación.
 *
 * URLs: `/t/:tenantSlug/venta/informes/venta-item` y
 * `/t/:tenantSlug/general/informes/venta-item`
 */
export const VENTA_ITEM_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/venta-item-list/venta-item-list.component').then(
        (m) => m.VentaItemListComponent,
      ),
  },
];
