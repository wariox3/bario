import { Route } from '@angular/router';
import { authGuard, rootRedirectGuard, tenantAccessGuard } from '@reddoc/core';
import { AUTH_ROUTES } from './features/auth/auth.routes';
import { erpModuleResolver } from '@erp/core/erp-modules';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', canActivate: [rootRedirectGuard], children: [] },

  // Auth — own layout
  {
    path: 'auth',
    loadChildren: () => AUTH_ROUTES,
  },

  // Shell layout (simple nav, no sidebar) — selección de contenedor
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/shell-layout/shell-layout.component').then((m) => m.ShellLayoutComponent),
    children: [
      {
        path: 'contenedores',
        loadChildren: () =>
          import('./features/contenedores/contenedores.routes').then((m) => m.CONTENEDORES_ROUTES),
      },
    ],
  },

  // Workspace layout (sidebar + main) — anidado bajo el tenant slug
  {
    path: 't/:tenantSlug',
    canActivate: [authGuard, tenantAccessGuard],
    loadComponent: () =>
      import('./layouts/workspace-layout/workspace-layout.component').then(
        (m) => m.WorkspaceLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'general/inicio' },
      {
        path: 'dashboard',
        // Ruta global (no-módulo): limpia el módulo activo para ocultar el sidebar.
        resolve: { _module: erpModuleResolver(null) },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'configuracion',
        // Ruta global (no-módulo): limpia el módulo activo para ocultar el sidebar.
        resolve: { _module: erpModuleResolver(null) },
        loadChildren: () =>
          import('./features/configuracion/configuracion.routes').then(
            (m) => m.CONFIGURACION_ROUTES,
          ),
      },
      {
        path: 'general',
        loadChildren: () =>
          import('./features/general/general.routes').then((m) => m.GENERAL_ROUTES),
      },
      {
        path: 'compra',
        loadChildren: () => import('./features/compra/compra.routes').then((m) => m.COMPRA_ROUTES),
      },
      {
        path: 'venta',
        loadChildren: () => import('./features/venta/venta.routes').then((m) => m.VENTA_ROUTES),
      },
      {
        path: 'inventario',
        loadChildren: () =>
          import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },
      {
        path: 'contabilidad',
        loadChildren: () =>
          import('./features/contabilidad/contabilidad.routes').then((m) => m.CONTABILIDAD_ROUTES),
      },
      {
        path: 'tesoreria',
        loadChildren: () =>
          import('./features/tesoreria/tesoreria.routes').then((m) => m.TESORERIA_ROUTES),
      },
      {
        path: 'cartera',
        loadChildren: () =>
          import('./features/cartera/cartera.routes').then((m) => m.CARTERA_ROUTES),
      },
      {
        path: 'humano',
        loadChildren: () => import('./features/humano/humano.routes').then((m) => m.HUMANO_ROUTES),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
