import {
  calcularResumen,
  recomputeImpuestosLinea,
  tasasDelItem,
  toLineaCalculo,
  type ErpSelectOption,
  type Item,
  type ResumenDocumento,
} from '@reddoc/core';
import { generarId } from '../../../core/utils/generar-id';
import type { ProductoCatalogo } from '../catalogo/producto-catalogo.model';
import {
  VERSION_CARRITOS,
  type Carrito,
  type EstadoCarritos,
  type LineaCarrito,
} from './carrito.model';

/**
 * Operaciones puras sobre los carritos: reciben un estado y devuelven otro, sin
 * HTTP ni Angular. El store las orquesta y las persiste.
 */

export function crearCarrito(nombre: string, contacto: ErpSelectOption | null): Carrito {
  return { uuid: generarId(), nombre, contacto, lineas: [] };
}

export function estadoInicial(nombre: string, contacto: ErpSelectOption | null): EstadoCarritos {
  const carrito = crearCarrito(nombre, contacto);
  return { version: VERSION_CARRITOS, carritos: [carrito], activoId: carrito.uuid };
}

/** Primer número libre para "Venta N": no repite el de una pestaña abierta. */
export function siguienteNumero(carritos: readonly Carrito[], prefijo: string): number {
  const patron = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`);
  const usados = new Set(
    carritos
      .map((c) => c.nombre.match(patron)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number),
  );
  let n = 1;
  while (usados.has(n)) n += 1;
  return n;
}

/** Recalcula los impuestos de la línea con su precio y cantidad actuales. */
function recalcular(linea: LineaCarrito): LineaCarrito {
  return { ...linea, impuestos_totales: recomputeImpuestosLinea(linea) };
}

/**
 * Línea nueva para un producto del catálogo, con los impuestos de venta del
 * ítem ya calculados. `precioLista` es el de la lista del cliente, si cotiza el
 * ítem; si no, manda el precio propio.
 */
export function lineaDesdeProducto(
  producto: ProductoCatalogo,
  item: Item,
  precioLista: number | null,
  almacen: ErpSelectOption | null,
): LineaCarrito {
  const tasas = tasasDelItem(item, 'venta');
  const precio = precioLista ?? producto.precio;
  const etiqueta = [producto.codigo, producto.nombre].filter(Boolean).join(' - ');
  return recalcular({
    id: null,
    item: { id: producto.id, nombre: etiqueta || producto.nombre, precio },
    cantidad: 1,
    precio,
    descuento: 0,
    impuestos_ids: tasas.map((t) => t.id),
    impuestos_totales: [],
    impuestos_disponibles: tasas,
    detalle: null,
    almacen,
    documento_detalle_afectado: null,
    codigo: producto.codigo,
    imagenUrl: producto.imagenUrl,
    disponible: producto.disponible,
    precioBase: producto.precio,
    precioEditado: false,
  });
}

/** La cantidad cabe en el stock de la línea. */
export function cabeEnStock(linea: Pick<LineaCarrito, 'disponible'>, cantidad: number): boolean {
  return linea.disponible === null || cantidad <= linea.disponible;
}

export function buscarLinea(carrito: Carrito, itemId: number): LineaCarrito | undefined {
  return carrito.lineas.find((l) => l.item.id === itemId);
}

export function agregarLinea(carrito: Carrito, linea: LineaCarrito): Carrito {
  return { ...carrito, lineas: [...carrito.lineas, linea] };
}

/** Fija la cantidad de una línea; en 0 o menos, la retira. No valida stock. */
export function conCantidad(carrito: Carrito, itemId: number, cantidad: number): Carrito {
  if (cantidad <= 0) return retirarLinea(carrito, itemId);
  return mapLinea(carrito, itemId, (l) => recalcular({ ...l, cantidad }));
}

/** Edición manual de precio y cantidad desde la caja. */
export function editarLinea(
  carrito: Carrito,
  itemId: number,
  cambios: { readonly precio: number; readonly cantidad: number },
): Carrito {
  return mapLinea(carrito, itemId, (l) =>
    recalcular({
      ...l,
      cantidad: cambios.cantidad,
      precio: cambios.precio,
      precioEditado: l.precioEditado || cambios.precio !== l.precio,
    }),
  );
}

export function retirarLinea(carrito: Carrito, itemId: number): Carrito {
  return { ...carrito, lineas: carrito.lineas.filter((l) => l.item.id !== itemId) };
}

/**
 * Aplica los precios de la lista de un cliente nuevo: cada línea no editada a
 * mano toma el de la lista o, si la lista no cotiza el ítem, vuelve a su precio
 * propio.
 */
export function recotizar(carrito: Carrito, precios: ReadonlyMap<number, number | null>): Carrito {
  return {
    ...carrito,
    lineas: carrito.lineas.map((l) => {
      if (l.precioEditado || !precios.has(l.item.id)) return l;
      const precio = precios.get(l.item.id) ?? l.precioBase;
      return precio === l.precio ? l : recalcular({ ...l, precio });
    }),
  };
}

export function resumenCarrito(carrito: Carrito): ResumenDocumento {
  return calcularResumen(carrito.lineas.map(toLineaCalculo));
}

export function cantidadTotal(carrito: Carrito): number {
  return carrito.lineas.reduce((acc, l) => acc + l.cantidad, 0);
}

function mapLinea(
  carrito: Carrito,
  itemId: number,
  fn: (linea: LineaCarrito) => LineaCarrito,
): Carrito {
  return { ...carrito, lineas: carrito.lineas.map((l) => (l.item.id === itemId ? fn(l) : l)) };
}

// ── Validación de lo persistido ──────────────────────────────────────────────

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object';
}

function esOpcion(valor: unknown): boolean {
  return esObjeto(valor) && typeof valor['id'] === 'number' && typeof valor['nombre'] === 'string';
}

function esLinea(valor: unknown): boolean {
  return (
    esObjeto(valor) &&
    esOpcion(valor['item']) &&
    typeof valor['cantidad'] === 'number' &&
    typeof valor['precio'] === 'number' &&
    typeof valor['precioBase'] === 'number' &&
    Array.isArray(valor['impuestos_ids']) &&
    Array.isArray(valor['impuestos_totales']) &&
    Array.isArray(valor['impuestos_disponibles'])
  );
}

function esCobroPendiente(valor: unknown): boolean {
  return (
    valor === undefined ||
    (esObjeto(valor) &&
      typeof valor['documentoId'] === 'number' &&
      typeof valor['pagado'] === 'boolean')
  );
}

function esCarrito(valor: unknown): boolean {
  return (
    esObjeto(valor) &&
    esCobroPendiente(valor['cobro']) &&
    typeof valor['uuid'] === 'string' &&
    typeof valor['nombre'] === 'string' &&
    (valor['contacto'] === null || esOpcion(valor['contacto'])) &&
    Array.isArray(valor['lineas']) &&
    valor['lineas'].every(esLinea)
  );
}

/** Valida el estado leído del almacenamiento local antes de usarlo. */
export function esEstadoCarritos(valor: unknown): valor is EstadoCarritos {
  if (!esObjeto(valor) || valor['version'] !== VERSION_CARRITOS) return false;
  const carritos = valor['carritos'];
  return (
    Array.isArray(carritos) &&
    carritos.length > 0 &&
    carritos.every(esCarrito) &&
    typeof valor['activoId'] === 'string'
  );
}

/** Lo justo del contacto para persistirlo: id, etiqueta y su lista de precios. */
export function contactoParaGuardar(contacto: ErpSelectOption | null): ErpSelectOption | null {
  if (!contacto) return null;
  const precioId = contacto['precio_id'];
  return {
    id: contacto.id,
    nombre: contacto.nombre,
    ...(typeof precioId === 'number' ? { precio_id: precioId } : {}),
  };
}
