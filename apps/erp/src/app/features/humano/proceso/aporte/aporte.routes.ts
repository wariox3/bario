import type { Route } from '@angular/router';

/**
 * Rutas del **aporte a seguridad social**.
 *
 * Mismo reparto que la programación de nómina: listado, formulario de cabecera y
 * un workspace que es **su propia página**. La razón es la máquina de estados —
 * un aporte generado tiene la cabecera bloqueada pero sigue necesitando el
 * workspace para aprobar, desgenerar o bajar el plano del operador. Si el
 * workspace viviera dentro del formulario, quedaría inalcanzable justo cuando más
 * se usa.
 *
 * URL base: `/t/:tenantSlug/humano/proceso/aporte`
 */
export const APORTE_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/aportes-list/aportes-list.component').then((m) => m.AportesListComponent),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/aporte-form/aporte-form.component').then((m) => m.AporteFormComponent),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/aporte-form/aporte-form.component').then((m) => m.AporteFormComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/aporte-workspace/aporte-workspace.component').then(
        (m) => m.AporteWorkspaceComponent,
      ),
  },
];
