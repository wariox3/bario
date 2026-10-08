import type { Route } from '@angular/router';

/**
 * Rutas del informe **Existencias** del módulo Inventario.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * La página deriva el módulo activo del `ActiveModuleStore`, así que se puede
 * montar desde otros módulos (venta, compra) sin tocarla.
 *
 * URL: `/t/:tenantSlug/inventario/informes/existencia`
 */
export const EXISTENCIA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/existencia-list/existencia-list.component').then(
        (m) => m.ExistenciaListComponent,
      ),
  },
];
