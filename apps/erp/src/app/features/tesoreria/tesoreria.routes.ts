import type { Route } from '@angular/router';
import { rutaContactos, rutaCuentasBanco } from '../masters-compartidos.routes';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { TESORERIA_MODULE } from './tesoreria.module-descriptor';

/**
 * Rutas del módulo Tesorería.
 *
 * Encadena dos resolvers ortogonales en la ruta raíz:
 *  - `erpModuleResolver('tesoreria')`: registra el módulo activo en
 *    `ActiveModuleStore` para que el topbar y el sidebar se sincronicen.
 *  - `activeModuleResolver('tesoreria')`: carga `TESORERIA_CONFIG` desde el
 *    registry y lo deja en `ModuleNavigationStore`, para que
 *    `activeDocumentResolver(...)` resuelva sus documentos dentro de
 *    `documentos/<doc>/<doc>.routes.ts`.
 */
export const TESORERIA_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('tesoreria'),
      _docModule: activeModuleResolver('tesoreria'),
    },
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
      {
        path: 'egreso',
        loadChildren: () =>
          import('./documentos/egreso/egreso.routes').then((m) => m.EGRESO_ROUTES),
      },
      {
        // Carcasa: shell vacío, pendiente de implementar como documento.
        path: 'saldo-inicial',
        loadChildren: () =>
          import('./documentos/saldo-inicial/saldo-inicial.routes').then(
            (m) => m.SALDO_INICIAL_ROUTES,
          ),
      },
      // Masters compartidos (ver `masters-compartidos.routes.ts`).
      ...rutaContactos(),
      ...rutaCuentasBanco(),
      {
        path: 'informes/cuenta-pagar',
        loadChildren: () =>
          import('./informes/cuenta-pagar/cuenta-pagar.routes').then((m) => m.CUENTA_PAGAR_ROUTES),
      },
    ],
  },
];
