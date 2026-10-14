import { itemRapidoToPayload, type ItemRapidoValores } from './item-rapido.mapper';

const base: ItemRapidoValores = {
  codigo: ' 7701234 ',
  nombre: ' Café molido ',
  precio: 12000,
  tipo: 'producto',
  inventario: true,
  impuestos_ids: [10],
  favorito: false,
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
