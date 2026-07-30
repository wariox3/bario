import type { Route } from '@angular/router';

/**
 * Rutas de la **programación de nómina**.
 *
 * Master con endpoint propio más el proceso que liquida el periodo. A diferencia
 * de la conciliación bancaria —donde el formulario de edición es el banco de
 * trabajo— acá el workspace es **su propia página**, y es por la máquina de
 * estados: una programación generada tiene la cabecera bloqueada pero sigue
 * necesitando su workspace para aprobar, desgenerar o ver las nóminas. Si el
 * workspace viviera dentro del formulario, quedaría inalcanzable justo cuando más
 * se usa.
 *
 * URL base: `/t/:tenantSlug/humano/proceso/programacion`
 */
export const PROGRAMACION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/programaciones-list/programaciones-list.component').then(
        (m) => m.ProgramacionesListComponent,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/programacion-form/programacion-form.component').then(
        (m) => m.ProgramacionFormComponent,
      ),
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/programacion-form/programacion-form.component').then(
        (m) => m.ProgramacionFormComponent,
      ),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/programacion-workspace/programacion-workspace.component').then(
        (m) => m.ProgramacionWorkspaceComponent,
      ),
  },
];
