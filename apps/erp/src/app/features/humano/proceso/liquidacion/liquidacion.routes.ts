import type { Route } from '@angular/router';

/**
 * Rutas de la **liquidación**.
 *
 * Listado, workspace y edición: **no hay `nuevo`**. Una liquidación la fabrica
 * el backend al terminar un contrato, y sus números los calcula él. A mano se
 * tocan los adicionales (desde el workspace) y, en borrador, el comentario y las
 * fechas de último pago (`editar/:id`).
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
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/liquidacion-form/liquidacion-form.component').then(
        (m) => m.LiquidacionFormComponent,
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
