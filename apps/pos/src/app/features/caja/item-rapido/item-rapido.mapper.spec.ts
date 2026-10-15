import type { Item } from '@reddoc/core';
import {
  itemRapidoDesdeItem,
  itemRapidoToPatch,
  itemRapidoToPayload,
  type ItemRapidoValores,
} from './item-rapido.mapper';

const base: ItemRapidoValores = {
  codigo: ' 7701234 ',
  nombre: ' Café molido ',
  precio: 12000,
  tipo: 'producto',
  inventario: true,
  impuestos_ids: [10],
  favorito: false,
  inactivo: false,
};

describe('itemRapidoToPayload', () => {
  it('crea un producto de venta, activo, con sus impuestos', () => {
    expect(itemRapidoToPayload(base)).toMatchObject({
      codigo: '7701234',
      nombre: 'Café molido',
      precio: 12000,
      producto: true,
      servicio: false,
      inventario: true,
      venta: true,
      inactivo: false,
      impuestos_ids: [10],
    });
  });

  it('un servicio nunca maneja inventario', () => {
    const p = itemRapidoToPayload({ ...base, tipo: 'servicio', inventario: true });
    expect(p.servicio).toBe(true);
    expect(p.inventario).toBe(false);
  });

  it('sin precio se guarda en cero', () => {
    expect(itemRapidoToPayload({ ...base, precio: null }).precio).toBe(0);
  });
});

/** Ítem con IVA de venta (10) y un IVA de compra (20) que la caja no muestra. */
const original = {
  id: 5,
  codigo: 'C-5',
  nombre: 'Café',
  precio: '9000.00',
  producto: true,
  servicio: false,
  inventario: true,
  favorito: true,
  inactivo: false,
  impuestos: [
    { impuesto: 10, impuesto_venta: true, impuesto_compra: false },
    { impuesto: 20, impuesto_venta: false, impuesto_compra: true },
  ],
} as unknown as Item;

describe('itemRapidoDesdeItem', () => {
  it('trae solo los impuestos de venta y el precio como número', () => {
    expect(itemRapidoDesdeItem(original)).toEqual({
      codigo: 'C-5',
      nombre: 'Café',
      precio: 9000,
      tipo: 'producto',
      inventario: true,
      impuestos_ids: [10],
      favorito: true,
      inactivo: false,
    });
  });
});

describe('itemRapidoToPatch', () => {
  it('manda solo lo que la caja edita, sin costo ni cuentas', () => {
    const patch = itemRapidoToPatch(itemRapidoDesdeItem(original), original);
    expect(Object.keys(patch).sort()).toEqual(
      [
        'codigo',
        'favorito',
        'impuestos_ids',
        'inactivo',
        'inventario',
        'nombre',
        'precio',
        'producto',
        'servicio',
      ].sort(),
    );
  });

  it('conserva los impuestos de compra al cambiar los de venta', () => {
    const patch = itemRapidoToPatch(
      { ...itemRapidoDesdeItem(original), impuestos_ids: [11] },
      original,
    );
    expect(patch.impuestos_ids).toEqual([20, 11]);
  });

  it('quitar todos los de venta no borra los de compra', () => {
    const patch = itemRapidoToPatch(
      { ...itemRapidoDesdeItem(original), impuestos_ids: [] },
      original,
    );
    expect(patch.impuestos_ids).toEqual([20]);
  });

  it('desactivar el ítem viaja en el patch', () => {
    const patch = itemRapidoToPatch({ ...itemRapidoDesdeItem(original), inactivo: true }, original);
    expect(patch.inactivo).toBe(true);
  });
});
