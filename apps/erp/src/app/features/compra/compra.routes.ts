import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { COMPRA_MODULE } from './compra.module-descriptor';

/**
 * Rutas del módulo Compra.
 *
 * Encadena dos resolvers ortogonales en la ruta raíz:
 *  - `erpModuleResolver('compra')`: registra el módulo activo en
 *    `ActiveModuleStore` para sincronizar topbar y sidebar.
 *  - `activeModuleResolver('compra')`: carga `COMPRA_CONFIG` desde el registry
 *    y lo deja en `ModuleNavigationStore`, para que `activeDocumentResolver(...)`
 *    resuelva los documentos dentro de `documentos/<doc>/<doc>.routes.ts`.
 *
 * Expone masters compartidos de general (item, contacto, resolución) reusados
 * vía `loadChildren`: son module-agnostic (derivan el módulo activo del
 * `ActiveModuleStore`), así que su navegación se queda en Compra. La resolución
 * además fija el flag con `data: { tipo: 'compra' }`. `formas-pago` también es
 * un master module-agnostic de general reusado aquí.
 */
export const COMPRA_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('compra'),
      _docModule: activeModuleResolver('compra'),
    },
    children: [
      moduleIndexRoute(COMPRA_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'factura-compra',
        loadChildren: () =>
          import('./documentos/factura-compra/factura-compra.routes').then(
            (m) => m.FACTURA_COMPRA_ROUTES,
          ),
      },
      {
        path: 'documento-soporte',
        loadChildren: () =>
          import('./documentos/documento-soporte/documento-soporte.routes').then(
            (m) => m.DOCUMENTO_SOPORTE_ROUTES,
          ),
      },
      {
        path: 'nota-credito-compra',
        loadChildren: () =>
          import('./documentos/nota-credito-compra/nota-credito-compra.routes').then(
            (m) => m.NOTA_CREDITO_COMPRA_ROUTES,
          ),
      },
      {
        path: 'nota-debito-compra',
        loadChildren: () =>
          import('./documentos/nota-debito-compra/nota-debito-compra.routes').then(
            (m) => m.NOTA_DEBITO_COMPRA_ROUTES,
          ),
      },
      {
        path: 'factura-compra-recurrente',
        loadChildren: () =>
          import('./documentos/factura-compra-recurrente/factura-compra-recurrente.routes').then(
            (m) => m.FACTURA_COMPRA_RECURRENTE_ROUTES,
          ),
      },
      {
        path: 'nota-ajuste',
        loadChildren: () =>
          import('./documentos/nota-ajuste/nota-ajuste.routes').then((m) => m.NOTA_AJUSTE_ROUTES),
      },
      {
        path: 'utilidades/documento-electronico',
        loadChildren: () =>
          import('./utilidades/documento-electronico/documento-electronico.routes').then(
            (m) => m.DOCUMENTO_ELECTRONICO_ROUTES,
          ),
      },
      {
        path: 'utilidades/eventos-dian',
        loadChildren: () =>
          import('./utilidades/eventos-dian/eventos-dian.routes').then(
            (m) => m.EVENTOS_DIAN_ROUTES,
          ),
      },
      {
        // Informe compartido: el código vive en tesoreria/informes/cuenta-pagar,
        // pero es module-agnostic (deriva el módulo activo del `ActiveModuleStore`,
        // fijado por el `erpModuleResolver('compra')` de la ruta raíz), así que su
        // navegación se queda dentro de Compra. Reusado igual en tesoreria y general.
        path: 'informes/cuenta-pagar',
        loadChildren: () =>
          import('../tesoreria/informes/cuenta-pagar/cuenta-pagar.routes').then(
            (m) => m.CUENTA_PAGAR_ROUTES,
          ),
      },
      {
        path: 'items',
        loadChildren: () =>
          import('../general/masters/item/item.routes').then((m) => m.ITEM_ROUTES),
      },
      {
        path: 'contactos',
        loadChildren: () =>
          import('../general/masters/contacto/contacto.routes').then((m) => m.CONTACTO_ROUTES),
      },
      {
        path: 'resoluciones',
        data: { tipo: 'compra' },
        loadChildren: () =>
          import('../general/masters/resolucion/resolucion.routes').then(
            (m) => m.RESOLUCION_ROUTES,
          ),
      },
      {
        path: 'formas-pago',
        loadChildren: () =>
          import('../general/masters/forma-pago/forma-pago.routes').then(
            (m) => m.FORMA_PAGO_ROUTES,
          ),
      },
      {
        // El master vive en inventario (su endpoint es `/inventario/almacen/`),
        // pero es module-agnostic igual que los de general.
        path: 'almacenes',
        loadChildren: () =>
          import('../inventario/masters/almacen/almacen.routes').then((m) => m.ALMACEN_ROUTES),
      },
    ],
  },
];
