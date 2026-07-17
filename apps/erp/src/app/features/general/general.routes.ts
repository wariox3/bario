import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { GENERAL_MODULE } from './general.module-descriptor';

/**
 * Rutas del módulo General.
 *
 * Encadena dos resolvers ortogonales en la ruta raíz:
 *  - `erpModuleResolver('general')`: registra el módulo activo en
 *    `ActiveModuleStore` para que el topbar y el sidebar se sincronicen.
 *  - `activeModuleResolver('general')`: carga `GENERAL_CONFIG` desde el registry
 *    y lo deja en `ModuleNavigationStore`, para que los documentos reusados de
 *    Venta y Compra resuelvan su config con `activeDocumentResolver(...)`.
 *
 * Delega cada master a su propio archivo de rutas dentro de
 * `masters/<entity>/<entity>.routes.ts` — cada master es un bounded context
 * auto-contenido (modelo, servicio, páginas, componentes y utilidades
 * específicas viven juntos).
 *
 * Camino B del enfoque híbrido, más los documentos compartidos del camino A
 * (ver docs/architecture/erp-module-architecture.md).
 */
export const GENERAL_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('general'),
      _docModule: activeModuleResolver('general'),
    },
    children: [
      moduleIndexRoute(GENERAL_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        // Reusa el placeholder compartido; reemplazar por un inicio propio
        // (como turno) cuando exista su endpoint de analítica.
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      // Documentos compartidos: el código vive en venta/compra, pero se enrutan
      // también desde General. Sus páginas derivan el módulo del
      // `ActiveModuleStore` (fijado arriba), así que la navegación se queda acá.
      {
        path: 'factura-venta',
        loadChildren: () =>
          import('../venta/documentos/factura-venta/factura-venta.routes').then(
            (m) => m.FACTURA_VENTA_ROUTES,
          ),
      },
      {
        path: 'factura-compra',
        loadChildren: () =>
          import('../compra/documentos/factura-compra/factura-compra.routes').then(
            (m) => m.FACTURA_COMPRA_ROUTES,
          ),
      },
      {
        path: 'pago',
        loadChildren: () =>
          import('../cartera/documentos/pago/pago.routes').then((m) => m.PAGO_ROUTES),
      },
      {
        path: 'egreso',
        loadChildren: () =>
          import('../tesoreria/documentos/egreso/egreso.routes').then((m) => m.EGRESO_ROUTES),
      },
      {
        path: 'contactos',
        loadChildren: () =>
          import('./masters/contacto/contacto.routes').then((m) => m.CONTACTO_ROUTES),
      },
      {
        path: 'items',
        loadChildren: () => import('./masters/item/item.routes').then((m) => m.ITEM_ROUTES),
      },
      {
        path: 'asesores',
        loadChildren: () => import('./masters/asesor/asesor.routes').then((m) => m.ASESOR_ROUTES),
      },
      {
        path: 'cuentas-banco',
        loadChildren: () =>
          import('./masters/cuenta-banco/cuenta-banco.routes').then((m) => m.CUENTA_BANCO_ROUTES),
      },
      {
        path: 'precios',
        loadChildren: () => import('./masters/precio/precio.routes').then((m) => m.PRECIO_ROUTES),
      },
      {
        path: 'sedes',
        loadChildren: () => import('./masters/sede/sede.routes').then((m) => m.SEDE_ROUTES),
      },
      // Futuros: almacenes, formas-pago, resoluciones.
      // Cada uno delega a su `masters/<entity>/<entity>.routes.ts`.
    ],
  },
];
