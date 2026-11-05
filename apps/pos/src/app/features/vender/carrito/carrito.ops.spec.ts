import type { Item } from '@reddoc/core';
import type { ProductoCatalogo } from '../catalogo/producto-catalogo.model';
import type { Carrito } from './carrito.model';
import {
  agregarLinea,
  cabeEnStock,
  cantidadTotal,
  conCantidad,
  contactoParaGuardar,
  crearCarrito,
  editarLinea,
  esEstadoCarritos,
  estadoInicial,
  lineaDesdeProducto,
  recotizar,
  resumenCarrito,
  siguienteNumero,
} from './carrito.ops';

const producto = (cambios: Partial<ProductoCatalogo> = {}): ProductoCatalogo => ({
  id: 1,
  codigo: 'A-01',
  nombre: 'Café',
  precio: 1000,
  favorito: false,
  disponible: 5,
  imagenUrl: null,
  ...cambios,
});

/** Ítem con IVA 19% de venta y una tasa de compra que no debe entrar. */
const item = {
  id: 1,
  impuestos: [
    {
      impuesto: 10,
      impuesto_nombre_extendido: 'IVA 19%',
      impuesto_porcentaje: '19.00',
      impuesto_porcentaje_base: '100.00',
      impuesto_venta: true,
      impuesto_compra: false,
      impuesto_operacion: 1,
    },
    {
      impuesto: 20,
      impuesto_nombre_extendido: 'IVA compras',
      impuesto_porcentaje: '19.00',
      impuesto_porcentaje_base: '100.00',
      impuesto_venta: false,
      impuesto_compra: true,
      impuesto_operacion: 1,
    },
  ],
} as unknown as Item;

const conLinea = (cambios: Partial<ProductoCatalogo> = {}, precioLista: number | null = null) =>
  agregarLinea(
    crearCarrito('Venta 1', null),
    lineaDesdeProducto(producto(cambios), item, precioLista, null),
  );

describe('lineaDesdeProducto', () => {
  it('toma solo los impuestos de venta y los calcula', () => {
    const linea = conLinea().lineas[0];
    expect(linea.impuestos_ids).toEqual([10]);
    expect(linea.impuestos_totales).toEqual([{ id: 10, nombre: 'IVA 19%', total: 190 }]);
    expect(linea.cantidad).toBe(1);
  });

  it('el precio de la lista del cliente pisa el propio, que queda como base', () => {
    const linea = conLinea({}, 800).lineas[0];
    expect(linea.precio).toBe(800);
    expect(linea.precioBase).toBe(1000);
  });
});

describe('cantidades y stock', () => {
  it('cambiar la cantidad recalcula los impuestos', () => {
    const carrito = conCantidad(conLinea(), 1, 3);
    expect(carrito.lineas[0].impuestos_totales[0].total).toBe(570);
    expect(cantidadTotal(carrito)).toBe(3);
  });

  it('cantidad cero retira la línea', () => {
    expect(conCantidad(conLinea(), 1, 0).lineas).toEqual([]);
  });

  it('el stock limita solo si el ítem lo controla', () => {
    expect(cabeEnStock({ disponible: 5 }, 5)).toBe(true);
    expect(cabeEnStock({ disponible: 5 }, 6)).toBe(false);
    expect(cabeEnStock({ disponible: null }, 999)).toBe(true);
  });
});

describe('editarLinea y recotizar', () => {
  it('editar el precio marca la línea para que un cambio de cliente no la pise', () => {
    const editado = editarLinea(conLinea(), 1, { precio: 700, cantidad: 2 });
    expect(editado.lineas[0].precioEditado).toBe(true);
    const recotizado = recotizar(editado, new Map([[1, 900]]));
    expect(recotizado.lineas[0].precio).toBe(700);
  });

  it('una línea no editada toma la lista nueva o vuelve a su precio propio', () => {
    const carrito = conLinea({}, 800);
    expect(recotizar(carrito, new Map([[1, 900]])).lineas[0].precio).toBe(900);
    expect(recotizar(carrito, new Map([[1, null]])).lineas[0].precio).toBe(1000);
  });
});

describe('resumen', () => {
  it('suma base e impuestos de las líneas', () => {
    const r = resumenCarrito(conCantidad(conLinea(), 1, 2));
    expect(r.subtotal).toBe(2000);
    expect(r.total).toBe(2380);
  });
});

describe('siguienteNumero', () => {
  it('usa el primer número libre', () => {
    const carritos: Carrito[] = [crearCarrito('Venta 1', null), crearCarrito('Venta 3', null)];
    expect(siguienteNumero(carritos, 'Venta')).toBe(2);
    expect(siguienteNumero([crearCarrito('Mesa 4', null)], 'Venta')).toBe(1);
  });
});

describe('persistencia', () => {
  it('acepta un estado válido y descarta uno de otra versión o vacío', () => {
    const estado = estadoInicial('Venta 1', null);
    expect(esEstadoCarritos(estado)).toBe(true);
    expect(esEstadoCarritos({ ...estado, version: 0 })).toBe(false);
    expect(esEstadoCarritos({ ...estado, carritos: [] })).toBe(false);
    expect(esEstadoCarritos({ ...estado, carritos: [{ uuid: 'x' }] })).toBe(false);
  });

  it('del contacto guarda id, etiqueta y lista de precios', () => {
    expect(
      contactoParaGuardar({ id: 3, nombre: '22 - Consumidor final', precio_id: 2, direccion: 'x' }),
    ).toEqual({ id: 3, nombre: '22 - Consumidor final', precio_id: 2 });
  });
});
