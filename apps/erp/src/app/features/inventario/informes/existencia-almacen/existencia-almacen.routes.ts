import type { Route } from '@angular/router';

/**
 * Rutas del informe **Existencias por almacén** del módulo Inventario.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * La página deriva el módulo activo del `ActiveModuleStore`, así que se puede
 * montar desde otros módulos sin tocarla.
 *
 * URL: `/t/:tenantSlug/inventario/informes/existencia-almacen`
 */
export const EXISTENCIA_ALMACEN_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/existencia-almacen-list/existencia-almacen-list.component').then(
        (m) => m.ExistenciaAlmacenListComponent,
      ),
  },
];
