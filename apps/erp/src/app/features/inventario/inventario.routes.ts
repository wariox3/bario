import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { INVENTARIO_MODULE } from './inventario.module-descriptor';

export const INVENTARIO_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('inventario'), // topbar + sidebar
      _docModule: activeModuleResolver('inventario'), // carga INVENTARIO_CONFIG
    },
    children: [
      moduleIndexRoute(INVENTARIO_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'entrada',
        loadChildren: () =>
          import('./documentos/entrada/entrada.routes').then((m) => m.ENTRADA_ROUTES),
      },
      {
        path: 'salida',
        loadChildren: () =>
          import('./documentos/salida/salida.routes').then((m) => m.SALIDA_ROUTES),
      },
      {
        path: 'traslado',
        loadChildren: () =>
          import('./documentos/traslado/traslado.routes').then((m) => m.TRASLADO_ROUTES),
      },
      // Master compartido: el ítem vive en General pero se administra desde
      // cualquier módulo que lo use (venta y compra ya lo montan igual). Sus
      // páginas derivan el módulo del `ActiveModuleStore`, así que las URLs y
      // las migas quedan bajo `/t/:slug/inventario/items`.
      {
        path: 'items',
        loadChildren: () =>
          import('../general/masters/item/item.routes').then((m) => m.ITEM_ROUTES),
      },
      // Master propio del módulo: su endpoint es `/inventario/almacen/`, del que
      // también cuelga el `seleccionar/` que ya usan los documentos.
      {
        path: 'almacenes',
        loadChildren: () =>
          import('./masters/almacen/almacen.routes').then((m) => m.ALMACEN_ROUTES),
      },
      {
        path: 'informes/existencia',
        loadChildren: () =>
          import('./informes/existencia/existencia.routes').then((m) => m.EXISTENCIA_ROUTES),
      },
      {
        path: 'informes/existencia-almacen',
        loadChildren: () =>
          import('./informes/existencia-almacen/existencia-almacen.routes').then(
            (m) => m.EXISTENCIA_ALMACEN_ROUTES,
          ),
      },
      {
        path: 'informes/inventario-valorizado',
        loadChildren: () =>
          import('./informes/inventario-valorizado/inventario-valorizado.routes').then(
            (m) => m.INVENTARIO_VALORIZADO_ROUTES,
          ),
      },
      {
        path: 'informes/historial-movimiento',
        loadChildren: () =>
          import('./informes/historial-movimiento/historial-movimiento.routes').then(
            (m) => m.HISTORIAL_MOVIMIENTO_ROUTES,
          ),
      },
    ],
  },
];
