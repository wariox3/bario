import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { TESORERIA_MODULE } from './tesoreria.module-descriptor';

export const TESORERIA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('tesoreria') },
    children: [
      moduleIndexRoute(TESORERIA_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      // Masters reutilizados del módulo General (contacto y cuenta-banco).
      {
        path: 'contactos',
        loadChildren: () =>
          import('@erp/features/general/masters/contacto/contacto.routes').then(
            (m) => m.CONTACTO_ROUTES,
          ),
      },
      {
        path: 'cuentas-banco',
        loadChildren: () =>
          import('@erp/features/general/masters/cuenta-banco/cuenta-banco.routes').then(
            (m) => m.CUENTA_BANCO_ROUTES,
          ),
      },
    ],
  },
];
