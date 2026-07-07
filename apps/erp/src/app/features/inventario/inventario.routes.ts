import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { INVENTARIO_MODULE } from './inventario.module-descriptor';

export const INVENTARIO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('inventario') },
    children: [
      moduleIndexRoute(INVENTARIO_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
    ],
  },
];
