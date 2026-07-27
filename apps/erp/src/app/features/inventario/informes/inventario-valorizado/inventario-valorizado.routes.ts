import type { Route } from '@angular/router';

/**
 * Rutas del informe **Inventario valorizado** del módulo Inventario.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * La página deriva el módulo activo del `ActiveModuleStore`, así que se puede
 * montar desde otros módulos sin tocarla.
 *
 * URL: `/t/:tenantSlug/inventario/informes/inventario-valorizado`
 */
export const INVENTARIO_VALORIZADO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventario-valorizado-list/inventario-valorizado-list.component').then(
        (m) => m.InventarioValorizadoListComponent,
      ),
  },
];
