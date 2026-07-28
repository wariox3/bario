import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { HUMANO_MODULE } from './humano.module-descriptor';

export const HUMANO_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('humano'), // topbar + sidebar
      _docModule: activeModuleResolver('humano'), // carga HUMANO_CONFIG
    },
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
        path: 'nomina',
        loadChildren: () =>
          import('./documentos/nomina/nomina.routes').then((m) => m.NOMINA_ROUTES),
      },
      {
        path: 'informes/nomina-detalle',
        loadChildren: () =>
          import('./informes/nomina-detalle/nomina-detalle.routes').then(
            (m) => m.NOMINA_DETALLE_INFORME_ROUTES,
          ),
      },
      {
        path: 'informes/nomina-electronica',
        loadChildren: () =>
          import('./informes/nomina-electronica/nomina-electronica.routes').then(
            (m) => m.NOMINA_ELECTRONICA_INFORME_ROUTES,
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
