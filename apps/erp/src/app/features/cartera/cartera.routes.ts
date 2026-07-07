import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { CARTERA_MODULE } from './cartera.module-descriptor';

export const CARTERA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('cartera') },
    children: [
      moduleIndexRoute(CARTERA_MODULE),
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
