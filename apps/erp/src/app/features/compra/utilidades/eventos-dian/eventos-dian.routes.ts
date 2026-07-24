import type { Route } from '@angular/router';

/**
 * Rutas de la utilidad **Eventos DIAN** del módulo Compra.
 *
 * Utilidad de una sola página (lista con acciones por fila). El componente se
 * carga lazy para mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/compra/utilidades/eventos-dian`
 */
export const EVENTOS_DIAN_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/eventos-dian-list/eventos-dian-list.component').then(
        (m) => m.EventosDianListComponent,
      ),
  },
];
