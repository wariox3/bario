import type { Route, Routes } from '@angular/router';
import type { ErpModuleDescriptor } from '@erp/core/erp-modules';
import { CARTERA_MODULE } from '@erp/features/cartera/cartera.module-descriptor';
import { CARTERA_ROUTES } from '@erp/features/cartera/cartera.routes';
import { COMPRA_MODULE } from '@erp/features/compra/compra.module-descriptor';
import { COMPRA_ROUTES } from '@erp/features/compra/compra.routes';
import { CONTABILIDAD_MODULE } from '@erp/features/contabilidad/contabilidad.module-descriptor';
import { CONTABILIDAD_ROUTES } from '@erp/features/contabilidad/contabilidad.routes';
import { GENERAL_MODULE } from '@erp/features/general/general.module-descriptor';
import { GENERAL_ROUTES } from '@erp/features/general/general.routes';
import { HUMANO_MODULE } from '@erp/features/humano/humano.module-descriptor';
import { HUMANO_ROUTES } from '@erp/features/humano/humano.routes';
import { INVENTARIO_MODULE } from '@erp/features/inventario/inventario.module-descriptor';
import { INVENTARIO_ROUTES } from '@erp/features/inventario/inventario.routes';
import { TESORERIA_MODULE } from '@erp/features/tesoreria/tesoreria.module-descriptor';
import { TESORERIA_ROUTES } from '@erp/features/tesoreria/tesoreria.routes';
import { VENTA_MODULE } from '@erp/features/venta/venta.module-descriptor';
import { VENTA_ROUTES } from '@erp/features/venta/venta.routes';
import type { ModeloId } from './modelo.catalog';
import { PERMISSION_ROUTE_DATA_KEY } from './permission.guard';
import type { SidebarSection } from '../erp-modules/sidebar-menu.types';

/**
 * El invariante que ningún tipo puede sostener: **menú y ruta tienen que
 * declarar el mismo modelo**.
 *
 * Son dos archivos distintos y nada los ata. Los dos olvidos posibles son
 * silenciosos, y por eso hacen falta estos tests:
 *
 *  - Declarar el modelo en el menú y no en la ruta → la pantalla queda abierta a
 *    quien escriba la URL. Como el menú hoy no poda (`GRANTS_COMPLETOS = false`),
 *    nada se ve raro: el link aparece y la página abre. Nadie se entera.
 *  - Declarar modelos distintos en cada lado → el sidebar ofrece un link que
 *    rebota al acceso denegado.
 *
 * Al sumar un módulo a la capa de permisos, sumarlo también acá (una línea en
 * `MODULOS`).
 */
const MODULOS: readonly { readonly descriptor: ErpModuleDescriptor; readonly rutas: Routes }[] = [
  { descriptor: GENERAL_MODULE, rutas: GENERAL_ROUTES },
  { descriptor: VENTA_MODULE, rutas: VENTA_ROUTES },
  { descriptor: COMPRA_MODULE, rutas: COMPRA_ROUTES },
  { descriptor: CARTERA_MODULE, rutas: CARTERA_ROUTES },
  { descriptor: TESORERIA_MODULE, rutas: TESORERIA_ROUTES },
  { descriptor: INVENTARIO_MODULE, rutas: INVENTARIO_ROUTES },
  { descriptor: CONTABILIDAD_MODULE, rutas: CONTABILIDAD_ROUTES },
  { descriptor: HUMANO_MODULE, rutas: HUMANO_ROUTES },
];

/**
 * Modelo declarado por cada ruta protegida, indexado por su `path`.
 *
 * Recorre los `children` porque cada módulo cuelga los suyos de una raíz con
 * resolvers. Las rutas gemelas comparten el `path` pero no llevan modelo, así
 * que no pisan nada.
 */
function modelosDeRutas(routes: Routes): ReadonlyMap<string, ModeloId> {
  const encontrados = new Map<string, ModeloId>();

  const recorrer = (rutas: readonly Route[]): void => {
    for (const ruta of rutas) {
      const modelo = ruta.data?.[PERMISSION_ROUTE_DATA_KEY] as ModeloId | undefined;
      if (ruta.path !== undefined && modelo !== undefined) encontrados.set(ruta.path, modelo);
      if (ruta.children) recorrer(ruta.children);
    }
  };

  recorrer(routes);
  return encontrados;
}

/**
 * Modelo declarado por cada entrada de menú, indexado por la raíz de su URL.
 *
 * La clave es `activeMatch ?? path`: los documentos apuntan a `<doc>/list` pero
 * su ruta es `<doc>`, y es `activeMatch` el que declara esa raíz.
 */
function modelosDeMenu(menu: readonly SidebarSection[]): ReadonlyMap<string, ModeloId> {
  const encontrados = new Map<string, ModeloId>();

  for (const seccion of menu) {
    if (seccion.kind === 'item') {
      if (seccion.modelo !== undefined) encontrados.set(seccion.path, seccion.modelo);
      continue;
    }
    for (const grupo of seccion.groups) {
      for (const item of grupo.items) {
        if (item.modelo !== undefined) encontrados.set(item.activeMatch ?? item.path, item.modelo);
      }
    }
  }

  return encontrados;
}

describe.each(MODULOS)('cableado de permisos · $descriptor.id', ({ descriptor, rutas }) => {
  const enRutas = modelosDeRutas(rutas);
  const enMenu = modelosDeMenu(descriptor.menu);

  it('toda entrada de menú con modelo tiene su ruta protegida con el mismo', () => {
    const divergencias = [...enMenu.entries()]
      .filter(([path, modelo]) => enRutas.get(path) !== modelo)
      .map(
        ([path, modelo]) => `${path}: menú=${modelo} ruta=${enRutas.get(path) ?? 'sin proteger'}`,
      );

    expect(divergencias).toEqual([]);
  });

  it('toda ruta protegida que además está en el menú declara el mismo modelo', () => {
    const divergencias = [...enRutas.entries()]
      .filter(([path, modelo]) => enMenu.has(path) && enMenu.get(path) !== modelo)
      .map(([path, modelo]) => `${path}: ruta=${modelo} menú=${enMenu.get(path)}`);

    expect(divergencias).toEqual([]);
  });

  it('declara al menos un modelo (si no, el módulo no está migrado y sobra acá)', () => {
    expect(enRutas.size).toBeGreaterThan(0);
  });
});
