import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { INVENTARIO_MODULE } from './inventario.module-descriptor';

export const INVENTARIO_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('inventario'), // topbar + sidebar
      _docModule: activeModuleResolver('inventario'), // carga INVENTARIO_CONFIG
    },
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
      {
        path: 'entrada',
        loadChildren: () =>
          import('./documentos/entrada/entrada.routes').then((m) => m.ENTRADA_ROUTES),
      },
      {
        path: 'salida',
        loadChildren: () =>
          import('./documentos/salida/salida.routes').then((m) => m.SALIDA_ROUTES),
      },
    ],
  },
];
