import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
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
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
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
        // Master compartido: el código vive en general/masters/resolucion, pero
        // se enruta desde Venta con `data: { tipo: 'venta' }` para fijar el flag.
        path: 'resoluciones',
        data: { tipo: 'venta' },
        loadChildren: () =>
          import('../general/masters/resolucion/resolucion.routes').then(
            (m) => m.RESOLUCION_ROUTES,
          ),
      },
      // Masters compartidos de general, reusados en Venta. Son module-agnostic:
      // derivan el módulo activo del `ActiveModuleStore` (fijado por el
      // `erpModuleResolver('venta')` de la ruta raíz), así que su navegación se
      // queda dentro de Venta. (sede: pendiente, el master aún no existe.)
      {
        path: 'contactos',
        loadChildren: () =>
          import('../general/masters/contacto/contacto.routes').then((m) => m.CONTACTO_ROUTES),
      },
      {
        path: 'items',
        loadChildren: () =>
          import('../general/masters/item/item.routes').then((m) => m.ITEM_ROUTES),
      },
      {
        path: 'precios',
        loadChildren: () =>
          import('../general/masters/precio/precio.routes').then((m) => m.PRECIO_ROUTES),
      },
      {
        path: 'asesores',
        loadChildren: () =>
          import('../general/masters/asesor/asesor.routes').then((m) => m.ASESOR_ROUTES),
      },
      {
        path: 'cuentas-banco',
        loadChildren: () =>
          import('../general/masters/cuenta-banco/cuenta-banco.routes').then(
            (m) => m.CUENTA_BANCO_ROUTES,
          ),
      },
    ],
  },
];
