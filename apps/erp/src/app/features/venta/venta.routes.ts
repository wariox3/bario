import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import {
  rutaAlmacenes,
  rutaAsesores,
  rutaContactos,
  rutaCuentasBanco,
  rutaItems,
  rutaPrecios,
  rutaResoluciones,
  rutaSedes,
} from '../masters-compartidos.routes';
import { VENTA_MODULE } from './venta.module-descriptor';

/**
 * Rutas del módulo Venta.
 *
 * Encadena dos resolvers ortogonales en la ruta raíz:
 *  - `erpModuleResolver('venta')`: registra el módulo activo en
 *    `ActiveModuleStore` para que el topbar y el sidebar se sincronicen.
 *  - `activeModuleResolver('venta')`: carga `VENTA_CONFIG` desde el registry
 *    y lo deja en `ModuleNavigationStore`. Sus `documents` quedan disponibles
 *    para que `activeDocumentResolver(...)` los resuelva dentro de cada
 *    `documentos/<doc>/<doc>.routes.ts`.
 *
 * Cada documento del módulo es un `loadChildren` separado — su form/detalle
 * vive junto a su config y se carga lazy. Sumar un documento nuevo: crear
 * `documentos/<id>/<id>.routes.ts`, agregar otra entrada `loadChildren` aquí
 * y declarar el `DocumentEntityConfig` correspondiente en `venta.config.ts`.
 */
export const VENTA_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('venta'),
      _docModule: activeModuleResolver('venta'),
    },
    children: [
      moduleIndexRoute(VENTA_MODULE),
      {
        // Inicio del módulo: hoy solo la invitación a facturar electrónicamente.
        path: 'inicio',
        loadComponent: () =>
          import('./inicio/venta-inicio.component').then((m) => m.VentaInicioComponent),
      },
      {
        path: 'pedido-cliente',
        loadChildren: () =>
          import('./documentos/pedido-cliente/pedido-cliente.routes').then(
            (m) => m.PEDIDO_CLIENTE_ROUTES,
          ),
      },
      {
        path: 'remision',
        loadChildren: () =>
          import('./documentos/remision/remision.routes').then((m) => m.REMISION_ROUTES),
      },
      {
        path: 'factura-venta',
        loadChildren: () =>
          import('./documentos/factura-venta/factura-venta.routes').then(
            (m) => m.FACTURA_VENTA_ROUTES,
          ),
      },
      {
        path: 'factura-pos',
        loadChildren: () =>
          import('./documentos/factura-pos/factura-pos.routes').then((m) => m.FACTURA_POS_ROUTES),
      },
      {
        path: 'factura-pos-electronica',
        loadChildren: () =>
          import('./documentos/factura-pos-electronica/factura-pos-electronica.routes').then(
            (m) => m.FACTURA_POS_ELECTRONICA_ROUTES,
          ),
      },
      {
        path: 'cuenta-cobro',
        loadChildren: () =>
          import('./documentos/cuenta-cobro/cuenta-cobro.routes').then(
            (m) => m.CUENTA_COBRO_ROUTES,
          ),
      },
      {
        path: 'factura-venta-recurrente',
        loadChildren: () =>
          import('./documentos/factura-venta-recurrente/factura-venta-recurrente.routes').then(
            (m) => m.FACTURA_VENTA_RECURRENTE_ROUTES,
          ),
      },
      {
        path: 'nota-credito',
        loadChildren: () =>
          import('./documentos/nota-credito/nota-credito.routes').then(
            (m) => m.NOTA_CREDITO_ROUTES,
          ),
      },
      {
        path: 'nota-debito',
        loadChildren: () =>
          import('./documentos/nota-debito/nota-debito.routes').then((m) => m.NOTA_DEBITO_ROUTES),
      },
      {
        path: 'contrato-servicio',
        loadChildren: () =>
          import('./documentos/contrato-servicio/contrato-servicio.routes').then(
            (m) => m.CONTRATO_SERVICIO_ROUTES,
          ),
      },
      {
        path: 'pedido-servicio',
        loadChildren: () =>
          import('./documentos/pedido-servicio/pedido-servicio.routes').then(
            (m) => m.PEDIDO_SERVICIO_ROUTES,
          ),
      },
      {
        path: 'proceso/regenerar-afectado',
        loadChildren: () =>
          import('./proceso/regenerar-afectado/regenerar-afectado.routes').then(
            (m) => m.REGENERAR_AFECTADO_ROUTES,
          ),
      },
      {
        path: 'utilidades/enviar-factura-electronica',
        loadChildren: () =>
          import('./utilidades/enviar-factura-electronica/enviar-factura-electronica.routes').then(
            (m) => m.ENVIAR_FACTURA_ELECTRONICA_ROUTES,
          ),
      },
      {
        path: 'informes/pendiente-facturar',
        loadChildren: () =>
          import('./informes/pendiente-facturar/pendiente-facturar.routes').then(
            (m) => m.PENDIENTE_FACTURAR_ROUTES,
          ),
      },
      {
        path: 'informes/venta-item',
        loadChildren: () =>
          import('./informes/venta-item/venta-item.routes').then((m) => m.VENTA_ITEM_ROUTES),
      },
      {
        // Informe compartido: el código vive en cartera/informes/cuenta-cobrar,
        // pero es module-agnostic (deriva el módulo activo del `ActiveModuleStore`,
        // fijado por el `erpModuleResolver('venta')` de la ruta raíz), así que su
        // navegación se queda dentro de Venta. Reusado igual en cartera y general.
        path: 'informes/cuenta-cobrar',
        loadChildren: () =>
          import('../cartera/informes/cuenta-cobrar/cuenta-cobrar.routes').then(
            (m) => m.CUENTA_COBRAR_ROUTES,
          ),
      },
      // Masters compartidos (ver `masters-compartidos.routes.ts`).
      ...rutaResoluciones({ tipo: 'venta' }),
      ...rutaContactos(),
      ...rutaItems(),
      ...rutaAlmacenes(),
      ...rutaSedes(),
      ...rutaPrecios(),
      ...rutaAsesores(),
      ...rutaCuentasBanco(),
    ],
  },
];
