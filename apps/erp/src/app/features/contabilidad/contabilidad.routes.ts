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
        path: 'informes/balance-prueba',
        loadChildren: () =>
          import('./informes/balance-prueba/balance-prueba.routes').then(
            (m) => m.BALANCE_PRUEBA_ROUTES,
          ),
      },
      {
        path: 'informes/balance-prueba-contacto',
        loadChildren: () =>
          import('./informes/balance-prueba-contacto/balance-prueba-contacto.routes').then(
            (m) => m.BALANCE_PRUEBA_CONTACTO_ROUTES,
          ),
      },
      {
        path: 'informes/certificado-retencion',
        loadChildren: () =>
          import('./informes/certificado-retencion/certificado-retencion.routes').then(
            (m) => m.CERTIFICADO_RETENCION_ROUTES,
          ),
      },
      {
        path: 'informes/base',
        loadChildren: () =>
          import('./informes/base/base.routes').then((m) => m.INFORME_BASE_ROUTES),
      },
      {
        path: 'informes/auxiliar-contacto',
        loadChildren: () =>
          import('./informes/auxiliar-contacto/auxiliar-contacto.routes').then(
            (m) => m.AUXILIAR_CONTACTO_ROUTES,
          ),
      },
      {
        path: 'informes/auxiliar-general',
        loadChildren: () =>
          import('./informes/auxiliar-general/auxiliar-general.routes').then(
            (m) => m.AUXILIAR_GENERAL_ROUTES,
          ),
      },
      {
        path: 'informes/auxiliar-cuenta',
        loadChildren: () =>
          import('./informes/auxiliar-cuenta/auxiliar-cuenta.routes').then(
            (m) => m.AUXILIAR_CUENTA_ROUTES,
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
