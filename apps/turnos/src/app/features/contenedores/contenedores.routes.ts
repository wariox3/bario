import type { Route } from '@angular/router';

/**
 * Rutas de la selección de contenedor de Turnos.
 *
 * Pantalla ligera: lista los contenedores a los que el usuario tiene acceso y,
 * al elegir uno, fija el tenant activo y entra a su workspace.
 */
export const CONTENEDORES_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/seleccion/contenedores-seleccion.component').then(
        (m) => m.ContenedoresSeleccionComponent,
      ),
  },
];
