import type { Route } from '@angular/router';

/**
 * Rutas del master **Prototipo** del módulo Turno.
 *
 * Administrador de solo lectura: listado + detalle. No hay alta ni edición (el
 * prototipo se crea/edita desde el modal de la programación). Los componentes se
 * cargan lazy para mantener el bundle del master por separado.
 *
 * URL: `/t/:tenantSlug/prototipos[/detalle/:id]`
 */
export const PROTOTIPO_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/prototipos-list/prototipos-list.component').then(
        (m) => m.PrototiposListComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/prototipo-detail/prototipo-detail.component').then(
        (m) => m.PrototipoDetailComponent,
      ),
  },
];
