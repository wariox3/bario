import { TestBed } from '@angular/core/testing';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { ItemService, type Item, type ListQuery } from '@reddoc/core';
import { CatalogoStore } from './catalogo.store';

const item = (id: number, cambios: Partial<Item> = {}): Item =>
  ({
    id,
    codigo: `C-${id}`,
    nombre: `Ítem ${id}`,
    precio: '1000.00',
    favorito: false,
    inventario: false,
    negativo: false,
    disponible: '0',
    venta: true,
    inactivo: false,
    ...cambios,
  }) as Item;

const pagina = (items: Item[], count = items.length) => of({ count, results: items });

function preparar() {
  const items = {
    list: jest.fn((query: ListQuery) => {
      void query;
      return pagina([item(1), item(2)]);
    }),
    actualizarFavorito: jest.fn(() => of(item(1))),
  };
  TestBed.configureTestingModule({
    providers: [CatalogoStore, { provide: ItemService, useValue: items }],
  });
  return { store: TestBed.inject(CatalogoStore), items };
}

const ultimaQuery = (items: { list: jest.Mock }): ListQuery =>
  items.list.mock.calls[items.list.mock.calls.length - 1][0];

describe('CatalogoStore', () => {
  describe('buscar', () => {
    it('trae los productos y queda listo', () => {
      const { store } = preparar();
      store.buscar({ modo: 'nombre', texto: '' });
      expect(store.estado()).toBe('listo');
      expect(store.productos().map((p) => p.id)).toEqual([1, 2]);
    });

    it('pide solo ítems de venta y activos, con favoritos primero', () => {
      const { store, items } = preparar();
      store.buscar({ modo: 'nombre', texto: '' });
      const query = ultimaQuery(items);
      expect(query.filters).toEqual([
        { field: 'venta', operator: 'eq', value: true },
        { field: 'inactivo', operator: 'eq', value: false },
      ]);
      expect(query.sort?.[0]).toEqual({ field: 'favorito', direction: 'desc' });
    });

    it('por nombre busca en nombre o código, antes de los filtros base', () => {
      const { store, items } = preparar();
      store.buscar({ modo: 'nombre', texto: ' café ' });
      expect(ultimaQuery(items).filters?.slice(0, 2)).toEqual([
        { field: 'nombre', operator: 'contains', value: 'café' },
        { field: 'codigo', operator: 'contains', value: 'café', logic: 'OR' },
      ]);
    });

    it('descarta lo que no es vendible aunque el backend ignore los filtros', () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(
        pagina([item(1), item(2, { venta: false }), item(3, { inactivo: true })]),
      );
      store.buscar({ modo: 'nombre', texto: '' });
      expect(store.productos().map((p) => p.id)).toEqual([1]);
    });

    it('si falla queda en error y sin productos', () => {
      const { store, items } = preparar();
      store.buscar({ modo: 'nombre', texto: '' });
      items.list.mockReturnValueOnce(throwError(() => new Error('500')));
      store.recargar();
      expect(store.estado()).toBe('error');
      expect(store.productos()).toEqual([]);
    });

    it('una respuesta de una búsqueda vieja no pisa la nueva', () => {
      const { store, items } = preparar();
      const vieja = new Subject<{ count: number; results: Item[] }>();
      items.list.mockReturnValueOnce(vieja).mockReturnValueOnce(pagina([item(9)]));
      store.buscar({ modo: 'nombre', texto: 'ca' });
      store.buscar({ modo: 'nombre', texto: 'café' });
      vieja.next({ count: 1, results: [item(1)] });
      expect(store.productos().map((p) => p.id)).toEqual([9]);
    });
  });

  describe('buscarCodigo (lector)', () => {
    it('devuelve el producto si hay uno solo con ese código exacto', async () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(pagina([item(5, { codigo: '7701' })]));
      const producto = await firstValueFrom(store.buscarCodigo(' 7701 '));
      expect(producto?.id).toBe(5);
      expect(ultimaQuery(items).filters?.[0]).toEqual({
        field: 'codigo',
        operator: 'eq',
        value: '7701',
      });
    });

    it('sin coincidencia exacta no devuelve nada', async () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(pagina([item(5, { codigo: '77010' })]));
      expect(await firstValueFrom(store.buscarCodigo('7701'))).toBeNull();
    });

    it('con dos productos del mismo código no elige ninguno', async () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(
        pagina([item(5, { codigo: '7701' }), item(6, { codigo: '7701' })]),
      );
      expect(await firstValueFrom(store.buscarCodigo('7701'))).toBeNull();
    });
  });

  describe('paginación', () => {
    it('cargar más suma la página siguiente hasta agotar el total', () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(pagina([item(1), item(2)], 3));
      store.buscar({ modo: 'nombre', texto: '' });
      expect(store.hayMas()).toBe(true);

      items.list.mockReturnValueOnce(pagina([item(3)], 3));
      store.cargarMas();
      expect(ultimaQuery(items).page).toBe(1);
      expect(store.productos().map((p) => p.id)).toEqual([1, 2, 3]);
      expect(store.hayMas()).toBe(false);
    });

    it('pagina por lo recibido, no por lo que quedó tras filtrar', () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(pagina([item(1), item(2, { venta: false })], 2));
      store.buscar({ modo: 'nombre', texto: '' });
      expect(store.productos()).toHaveLength(1);
      expect(store.hayMas()).toBe(false);
    });

    it('si falla una página adicional, lo cargado se queda y se puede reintentar', () => {
      const { store, items } = preparar();
      items.list.mockReturnValueOnce(pagina([item(1)], 2));
      store.buscar({ modo: 'nombre', texto: '' });

      items.list.mockReturnValueOnce(throwError(() => new Error('500')));
      store.cargarMas();
      expect(store.estado()).toBe('listo');
      expect(store.productos().map((p) => p.id)).toEqual([1]);

      items.list.mockReturnValueOnce(pagina([item(2)], 2));
      store.cargarMas();
      expect(ultimaQuery(items).page).toBe(1);
      expect(store.productos().map((p) => p.id)).toEqual([1, 2]);
    });
  });

  describe('favoritos', () => {
    it('marca al instante y llama al backend', async () => {
      const { store, items } = preparar();
      store.buscar({ modo: 'nombre', texto: '' });
      const listo = firstValueFrom(store.alternarFavorito(1), { defaultValue: undefined });
      expect(store.productos()[0].favorito).toBe(true);
      await listo;
      expect(items.actualizarFavorito).toHaveBeenCalledWith(1, true);
    });

    it('si el backend lo rechaza, vuelve a como estaba', async () => {
      const { store, items } = preparar();
      store.buscar({ modo: 'nombre', texto: '' });
      items.actualizarFavorito.mockReturnValueOnce(throwError(() => new Error('403')));
      await expect(firstValueFrom(store.alternarFavorito(1))).rejects.toThrow('403');
      expect(store.productos()[0].favorito).toBe(false);
    });
  });
});
