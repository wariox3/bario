import type { Routes } from '@angular/router';

/**
 * Rutas de Seguridad del contenedor.
 *
 * Feature tradicional bajo `/t/:slug/seguridad` (hermana de `configuracion`,
 * fuera del framework de módulos). El shell aloja el **menú lateral** y un
 * `<router-outlet>`: cada sección es una ruta hija real —no un query-param—,
 * así el deep-link, el back del navegador y el lazy-loading por sección salen
 * gratis. Sumar una sección = una entrada en `SEGURIDAD_MENU` + una ruta acá.
 */
export const SEGURIDAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/seguridad/seguridad.component').then((m) => m.SeguridadComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./sections/usuarios/usuarios.routes').then((m) => m.SEGURIDAD_USUARIOS_ROUTES),
      },
    ],
  },
];
