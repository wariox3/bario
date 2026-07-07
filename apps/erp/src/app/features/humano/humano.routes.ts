import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { HUMANO_MODULE } from './humano.module-descriptor';

export const HUMANO_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('humano') },
    children: [
      moduleIndexRoute(HUMANO_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'empleados',
        loadChildren: () =>
          import('./masters/empleado/empleado.routes').then((m) => m.EMPLEADO_ROUTES),
      },
      {
        path: 'contratos',
        loadChildren: () =>
          import('./masters/contrato/contrato.routes').then((m) => m.CONTRATO_ROUTES),
      },
      {
        path: 'creditos',
        loadChildren: () =>
          import('./masters/credito/credito.routes').then((m) => m.CREDITO_ROUTES),
      },
      {
        path: 'adicionales',
        loadChildren: () =>
          import('./masters/adicional/adicional.routes').then((m) => m.ADICIONAL_ROUTES),
      },
      {
        path: 'novedades',
        loadChildren: () =>
          import('./masters/novedad/novedad.routes').then((m) => m.NOVEDAD_ROUTES),
      },
      {
        path: 'cargos',
        loadChildren: () => import('./masters/cargo/cargo.routes').then((m) => m.CARGO_ROUTES),
      },
      {
        path: 'grupos',
        loadChildren: () => import('./masters/grupo/grupo.routes').then((m) => m.GRUPO_ROUTES),
      },
      {
        path: 'sucursales',
        loadChildren: () =>
          import('./masters/sucursal/sucursal.routes').then((m) => m.SUCURSAL_ROUTES),
      },
    ],
  },
];
