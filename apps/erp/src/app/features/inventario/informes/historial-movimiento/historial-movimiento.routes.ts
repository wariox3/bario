import type { Route } from '@angular/router';

/**
 * Rutas del informe **Historial de movimientos** del módulo Inventario.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * La página deriva el módulo activo del `ActiveModuleStore`, así que se puede
 * montar desde otros módulos sin tocarla.
 *
 * URL: `/t/:tenantSlug/inventario/informes/historial-movimiento`
 */
export const HISTORIAL_MOVIMIENTO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/historial-movimiento-list/historial-movimiento-list.component').then(
        (m) => m.HistorialMovimientoListComponent,
      ),
  },
];
