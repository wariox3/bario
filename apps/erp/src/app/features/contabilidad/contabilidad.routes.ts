import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { CONTABILIDAD_MODULE } from './contabilidad.module-descriptor';

export const CONTABILIDAD_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('contabilidad') },
    children: [
      moduleIndexRoute(CONTABILIDAD_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'centros-costo',
        loadChildren: () =>
          import('./masters/centro-costo/centro-costo.routes').then((m) => m.CENTRO_COSTO_ROUTES),
      },
      {
        path: 'cuentas',
        loadChildren: () => import('./masters/cuenta/cuenta.routes').then((m) => m.CUENTA_ROUTES),
      },
      {
        path: 'activos',
        loadChildren: () => import('./masters/activo/activo.routes').then((m) => m.ACTIVO_ROUTES),
      },
      {
        path: 'periodo',
        loadChildren: () =>
          import('./masters/periodo/periodo.routes').then((m) => m.PERIODO_ROUTES),
      },
    ],
  },
];
