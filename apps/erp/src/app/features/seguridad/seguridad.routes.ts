import type { Routes } from '@angular/router';

/**
 * Rutas de Seguridad del contenedor.
 *
 * Feature tradicional bajo `/t/:slug/seguridad` (hermana de `configuracion`,
 * fuera del framework de módulos). El shell aloja las pestañas por área; la
 * pestaña activa viaja en el query-param `?seccion=`. Hoy solo existe
 * "Usuarios"; los permisos granulares entrarán como una pestaña más.
 */
export const SEGURIDAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/seguridad/seguridad.component').then((m) => m.SeguridadComponent),
  },
];
