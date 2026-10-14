import type { Item } from '@reddoc/core';
import { esVendible, itemToProductoCatalogo } from './producto-catalogo.mapper';
import { estaAgotado } from './producto-catalogo.model';

const item = (cambios: Partial<Item> = {}): Item =>
  ({
    id: 7,
    codigo: 'A-01',
    nombre: 'Café',
    referencia: null,
    precio: '4500.000000' as unknown as number,
    costo: 0,
    producto: true,
    servicio: false,
    inventario: true,
    negativo: false,
    venta: true,
    favorito: false,
    inactivo: false,
    existencia: '10.000000',
    disponible: '3.000000',
    cuenta_venta: null,
    cuenta_compra: null,
    cuenta_costo_venta: null,
    cuenta_inventario: null,
    ...cambios,
  }) as Item;

describe('itemToProductoCatalogo', () => {
  it('normaliza precio y disponible que llegan como string decimal', () => {
    const p = itemToProductoCatalogo(item());
    expect(p.precio).toBe(4500);
    expect(p.disponible).toBe(3);
  });

  it('sin inventario no limita el stock', () => {
    expect(itemToProductoCatalogo(item({ inventario: false })).disponible).toBeNull();
  });

  it('con saldo negativo permitido no limita el stock', () => {
    expect(itemToProductoCatalogo(item({ negativo: true })).disponible).toBeNull();
  });

  it('controla stock y sin disponible queda agotado', () => {
    const p = itemToProductoCatalogo(item({ disponible: '0.000000' }));
    expect(p.disponible).toBe(0);
    expect(estaAgotado(p)).toBe(true);
  });

  it('prefiere la miniatura y cae a la imagen completa', () => {
    expect(
      itemToProductoCatalogo(
        item({ imagen_principal_url: 'grande.jpg', imagen_principal_url_miniatura: 'mini.jpg' }),
      ).imagenUrl,
    ).toBe('mini.jpg');
    expect(itemToProductoCatalogo(item({ imagen_principal_url: 'grande.jpg' })).imagenUrl).toBe(
      'grande.jpg',
    );
  });
});

describe('esVendible', () => {
  it('descarta los ítems que no son de venta o están inactivos', () => {
    expect(esVendible(item())).toBe(true);
    expect(esVendible(item({ venta: false }))).toBe(false);
    expect(esVendible(item({ inactivo: true }))).toBe(false);
  });
});
