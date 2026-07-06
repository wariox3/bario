import { Route } from '@angular/router';
import { authGuard, rootRedirectGuard, tenantAccessGuard } from '@reddoc/core';
import { AUTH_ROUTES } from './features/auth/auth.routes';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', canActivate: [rootRedirectGuard], children: [] },

  // Auth — layout propio
  {
    path: 'auth',
    loadChildren: () => AUTH_ROUTES,
  },

  // Shell layout (nav simple, sin sidebar) — selección de contenedor
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
    loadChildren: () => import('./features/turno/turno.routes').then((m) => m.TURNO_ROUTES),
  },

  { path: '**', redirectTo: '' },
];
