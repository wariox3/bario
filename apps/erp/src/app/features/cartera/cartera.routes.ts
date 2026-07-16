import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { CARTERA_MODULE } from './cartera.module-descriptor';

/**
 * Rutas del módulo Cartera.
 *
 * Encadena dos resolvers ortogonales en la ruta raíz:
 *  - `erpModuleResolver('cartera')`: registra el módulo activo en
 *    `ActiveModuleStore` para que el topbar y el sidebar se sincronicen.
 *  - `activeModuleResolver('cartera')`: carga `CARTERA_CONFIG` desde el registry
 *    y lo deja en `ModuleNavigationStore`, para que `activeDocumentResolver(...)`
 *    resuelva sus documentos dentro de `documentos/<doc>/<doc>.routes.ts`.
 */
export const CARTERA_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('cartera'),
      _docModule: activeModuleResolver('cartera'),
    },
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
      {
        path: 'pago',
        loadChildren: () => import('./documentos/pago/pago.routes').then((m) => m.PAGO_ROUTES),
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
