import type { Route } from '@angular/router';
import { MODELO, withPermission } from '@erp/core/permissions';

/**
 * Rutas de los masters que se navegan **desde varios módulos**.
 *
 * Contactos se abre desde seis módulos, ítems desde cuatro, cuentas de banco
 * desde cuatro. Cada módulo repetía el bloque entero —path, import lazy y
 * permiso—, así que el mismo master vivía copiado hasta seis veces: mover el
 * master o cambiar su modelo obligaba a acertarle a todas, y una copia sin
 * `withPermission` es justo el agujero silencioso que esta capa quiere evitar
 * (la pantalla abierta a quien escriba la URL, sin que nada se vea raro).
 *
 * Acá el path, el import y el modelo viven **una sola vez**. Cada módulo hace:
 *
 * ```ts
 * children: [
 *   …
 *   ...rutaContactos(),
 *   ...rutaResoluciones({ tipo: 'compra' }),
 * ],
 * ```
 *
 * Ojo con el spread: `withPermission` devuelve **dos** rutas (la real y su
 * gemela de acceso denegado).
 *
 * Los masters son **module-agnostic**: derivan el módulo activo del
 * `ActiveModuleStore` —fijado por el `erpModuleResolver` de la ruta raíz de cada
 * módulo—, así que su navegación interna se queda donde entraste.
 *
 * Cada módulo sigue eligiendo **cuáles** ofrece: esto no arma el menú, solo
 * evita que la misma ruta se escriba seis veces.
 */

/** Contactos — el master más compartido: general, venta, compra, cartera, tesorería y contabilidad. */
export const rutaContactos = (): Route[] =>
  withPermission(MODELO.general.contacto, {
    path: 'contactos',
    loadChildren: () =>
      import('./general/masters/contacto/contacto.routes').then((m) => m.CONTACTO_ROUTES),
  });

/** Ítems — general, venta, compra e inventario. */
export const rutaItems = (): Route[] =>
  withPermission(MODELO.general.item, {
    path: 'items',
    loadChildren: () => import('./general/masters/item/item.routes').then((m) => m.ITEM_ROUTES),
  });

/** Cuentas de banco — general, venta, cartera y tesorería. */
export const rutaCuentasBanco = (): Route[] =>
  withPermission(MODELO.general.cuentaBanco, {
    path: 'cuentas-banco',
    loadChildren: () =>
      import('./general/masters/cuenta-banco/cuenta-banco.routes').then(
        (m) => m.CUENTA_BANCO_ROUTES,
      ),
  });

/** Lista de precios — general y venta. */
export const rutaPrecios = (): Route[] =>
  withPermission(MODELO.general.precio, {
    path: 'precios',
    loadChildren: () =>
      import('./general/masters/precio/precio.routes').then((m) => m.PRECIO_ROUTES),
  });

/** Asesores — general y venta. */
export const rutaAsesores = (): Route[] =>
  withPermission(MODELO.general.asesor, {
    path: 'asesores',
    loadChildren: () =>
      import('./general/masters/asesor/asesor.routes').then((m) => m.ASESOR_ROUTES),
  });

/** Sedes — hoy solo general, pero es del mismo lote compartido. */
export const rutaSedes = (): Route[] =>
  withPermission(MODELO.general.sede, {
    path: 'sedes',
    loadChildren: () => import('./general/masters/sede/sede.routes').then((m) => m.SEDE_ROUTES),
  });

/** Formas de pago — hoy solo compra. */
export const rutaFormasPago = (): Route[] =>
  withPermission(MODELO.general.formaPago, {
    path: 'formas-pago',
    loadChildren: () =>
      import('./general/masters/forma-pago/forma-pago.routes').then((m) => m.FORMA_PAGO_ROUTES),
  });

/**
 * Resoluciones — venta y compra.
 *
 * Es el único que necesita `data`: el master fija el flag de tipo según desde
 * dónde se entró, así que el módulo lo declara al usarlo.
 */
export const rutaResoluciones = (data: { readonly tipo: 'venta' | 'compra' }): Route[] =>
  withPermission(MODELO.general.resolucion, {
    path: 'resoluciones',
    data,
    loadChildren: () =>
      import('./general/masters/resolucion/resolucion.routes').then((m) => m.RESOLUCION_ROUTES),
  });

/**
 * Almacenes — venta, compra e inventario.
 *
 * **Sin permiso todavía**: el backend no tiene `almacen` en `gen_modelo`, así
 * que no hay a quién preguntarle y la ruta queda abierta. El día que lo
 * catalogue, se envuelve acá y quedan protegidas las tres de una.
 */
export const rutaAlmacenes = (): Route[] => [
  {
    path: 'almacenes',
    loadChildren: () =>
      import('./inventario/masters/almacen/almacen.routes').then((m) => m.ALMACEN_ROUTES),
  },
];
