import type { Routes } from '@angular/router';

/**
 * Rutas de «Mi empresa» (`/t/:slug/empresa`).
 *
 * Feature tradicional fuera del framework de módulos, hermana de `configuracion`
 * y `dashboard`. El guard de propietario y la limpieza del módulo activo los
 * pone la ruta padre en `app.routes.ts`.
 */
export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/mi-empresa/mi-empresa.component').then((m) => m.MiEmpresaComponent),
  },
];
