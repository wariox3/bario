import type { Route } from '@angular/router';

/**
 * Rutas del proceso **Regenerar horas** del módulo Turno.
 *
 * Proceso de una sola página (consola de disparo). El componente se carga lazy
 * para mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/proceso/regenerar-horas`
 */
export const REGENERAR_HORAS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/regenerar-horas/regenerar-horas.component').then(
        (m) => m.RegenerarHorasComponent,
      ),
  },
];
