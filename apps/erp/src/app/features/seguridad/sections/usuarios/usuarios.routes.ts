import type { Routes } from '@angular/router';

/**
 * Rutas de la sección **Usuarios** de Seguridad.
 * URL: `/t/:tenantSlug/seguridad/usuarios` (+ `detalle/:id`).
 */
export const SEGURIDAD_USUARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/usuarios-list/usuarios-list.component').then((m) => m.UsuariosListComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/usuario-detail/usuario-detail.component').then(
        (m) => m.UsuarioDetailComponent,
      ),
  },
];
