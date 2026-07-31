import type { Route } from '@angular/router';

/**
 * Rutas de la **liquidación**.
 *
 * Solo listado y workspace: **no hay `nuevo` ni `editar`**. Una liquidación la
 * fabrica el backend al terminar un contrato, y sus números los calcula él; lo
 * único que se toca a mano son los adicionales, desde el workspace.
 *
 * URL base: `/t/:tenantSlug/humano/proceso/liquidacion`
 */
export const LIQUIDACION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/liquidaciones-list/liquidaciones-list.component').then(
        (m) => m.LiquidacionesListComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/liquidacion-workspace/liquidacion-workspace.component').then(
        (m) => m.LiquidacionWorkspaceComponent,
      ),
  },
];
