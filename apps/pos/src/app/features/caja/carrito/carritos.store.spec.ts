import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, lastValueFrom, of, throwError } from 'rxjs';
import {
  I18nService,
  ItemService,
  PrecioDetalleService,
  TenantService,
  type Item,
} from '@reddoc/core';
import { ConfiguracionCajaStore } from '../../configuracion/configuracion-caja.store';
import type { ProductoCatalogo } from '../catalogo/producto-catalogo.model';
import { CarritosStore } from './carritos.store';

const producto = (cambios: Partial<ProductoCatalogo> = {}): ProductoCatalogo => ({
  id: 1,
  codigo: 'A-01',
  nombre: 'Café',
  precio: 1000,
  favorito: false,
  disponible: null,
  imagenUrl: null,
  ...cambios,
});

const item = (id: number): Item => ({ id, impuestos: [] }) as unknown as Item;

/** Contacto con lista de precios propia (`precio_id`). */
const conLista = { id: 7, nombre: '900 - Mayorista', precio_id: 3 };

function preparar() {
  const slug = signal<string | null>('acme');
  const items = { getById: jest.fn((id: number) => of(item(id))) };
  const precios = { consultarPrecioItem: jest.fn(() => of<number | null>(null)) };
  TestBed.configureTestingModule({
    providers: [
      { provide: TenantService, useValue: { currentSlug: slug } },
      { provide: ItemService, useValue: items },
      { provide: PrecioDetalleService, useValue: precios },
      {
        provide: ConfiguracionCajaStore,
        useValue: { configuracion: signal({ almacen: { id: 2, nombre: 'Principal' } }) },
      },
      {
        provide: I18nService,
        useValue: { t: signal({ caja: { carrito: { prefijoVenta: 'Venta' } } }) },
      },
    ],
  });
  return { store: TestBed.inject(CarritosStore), slug, items, precios };
}

/** Simula recargar la página: un store nuevo que lee lo que quedó guardado. */
function recargar(): CarritosStore {
  TestBed.resetTestingModule();
  return preparar().store;
}

const agregar = (store: CarritosStore, p: ProductoCatalogo = producto()) =>
  lastValueFrom(store.agregarProducto(p));

const cantidad = (store: CarritosStore, itemId = 1) =>
  store.activo().lineas.find((l) => l.item.id === itemId)?.cantidad;

describe('CarritosStore', () => {
  beforeEach(() => localStorage.clear());

  describe('persistencia', () => {
    it('sin nada guardado arranca con una venta vacía', () => {
      const { store } = preparar();
      expect(store.carritos()).toHaveLength(1);
      expect(store.activo().nombre).toBe('Venta 1');
      expect(store.activo().lineas).toEqual([]);
    });

    it('las ventas sobreviven a una recarga', async () => {
      const { store } = preparar();
      await agregar(store);
      store.nueva();
      const recargado = recargar();
      expect(recargado.carritos().map((c) => c.nombre)).toEqual(['Venta 1', 'Venta 2']);
      expect(recargado.activo().nombre).toBe('Venta 2');
      expect(recargado.carritos()[0].lineas).toHaveLength(1);
    });

    it('lo guardado corrupto se descarta sin romper la caja', () => {
      localStorage.setItem('pos:carritos:acme', '{"version":1,"carritos":[{"uuid":');
      const { store } = preparar();
      expect(store.activo().nombre).toBe('Venta 1');
    });

    it('lo guardado con otra versión se descarta', () => {
      localStorage.setItem(
        'pos:carritos:acme',
        JSON.stringify({ version: 0, carritos: [], activoId: 'x' }),
      );
      const { store } = preparar();
      expect(store.carritos()).toHaveLength(1);
      expect(localStorage.getItem('pos:carritos:acme')).toBeNull();
    });

    it('cada empresa tiene sus propias ventas', async () => {
      const { store, slug } = preparar();
      await agregar(store);
      slug.set('globex');
      expect(store.activo().lineas).toEqual([]);
      slug.set('acme');
      expect(cantidad(store)).toBe(1);
    });
  });

  describe('agregar productos', () => {
    it('un producto nuevo trae su detalle y entra con una unidad', async () => {
      const { store, items } = preparar();
      expect(await agregar(store)).toBe('agregado');
      expect(items.getById).toHaveBeenCalledWith(1);
      expect(cantidad(store)).toBe(1);
      expect(store.activo().lineas[0].almacen).toEqual({ id: 2, nombre: 'Principal' });
    });

    it('si ya está en la venta suma sin volver a la red', async () => {
      const { store, items } = preparar();
      await agregar(store);
      expect(await agregar(store)).toBe('agregado');
      expect(cantidad(store)).toBe(2);
      expect(items.getById).toHaveBeenCalledTimes(1);
    });

    it('dos lecturas seguidas del lector suman dos, con una sola consulta', async () => {
      const { store, items } = preparar();
      const detalle = new Subject<Item>();
      items.getById.mockReturnValueOnce(detalle);
      const primera = agregar(store);
      const segunda = agregar(store);
      detalle.next(item(1));
      detalle.complete();
      expect(await primera).toBe('agregado');
      expect(await segunda).toBe('agregado');
      expect(cantidad(store)).toBe(2);
      expect(items.getById).toHaveBeenCalledTimes(1);
    });

    it('las lecturas de más se recortan al stock disponible', async () => {
      const { store, items } = preparar();
      const detalle = new Subject<Item>();
      items.getById.mockReturnValueOnce(detalle);
      const primera = agregar(store, producto({ disponible: 1 }));
      void agregar(store, producto({ disponible: 1 }));
      detalle.next(item(1));
      detalle.complete();
      expect(await primera).toBe('sinStock');
      expect(cantidad(store)).toBe(1);
    });

    it('no pasa del stock al sumar sobre una línea existente', async () => {
      const { store } = preparar();
      await agregar(store, producto({ disponible: 1 }));
      expect(await agregar(store, producto({ disponible: 1 }))).toBe('sinStock');
      expect(cantidad(store)).toBe(1);
    });

    it('un producto agotado no entra ni consulta la red', async () => {
      const { store, items } = preparar();
      expect(await agregar(store, producto({ disponible: 0 }))).toBe('sinStock');
      expect(store.activo().lineas).toEqual([]);
      expect(items.getById).not.toHaveBeenCalled();
    });

    it('si falla la red no cambia la venta y se puede reintentar', async () => {
      const { store, items } = preparar();
      items.getById.mockReturnValueOnce(throwError(() => new Error('red')));
      expect(await agregar(store)).toBe('error');
      expect(store.activo().lineas).toEqual([]);
      expect(await agregar(store)).toBe('agregado');
      expect(cantidad(store)).toBe(1);
    });

    it('el detalle del ítem se reutiliza al volver a agregarlo', async () => {
      const { store, items } = preparar();
      await agregar(store);
      store.retirarLinea(1);
      await agregar(store);
      expect(items.getById).toHaveBeenCalledTimes(1);
    });

    it('con cliente con lista, el precio de la lista pisa el del ítem', async () => {
      const { store, precios } = preparar();
      precios.consultarPrecioItem.mockReturnValue(of(800));
      await lastValueFrom(store.cambiarContacto(conLista));
      await agregar(store);
      expect(precios.consultarPrecioItem).toHaveBeenCalledWith(3, 1);
      expect(store.activo().lineas[0].precio).toBe(800);
    });

    it('si la lista no cotiza el ítem, queda su precio propio', async () => {
      const { store, precios } = preparar();
      precios.consultarPrecioItem.mockReturnValue(throwError(() => new Error('404')));
      await lastValueFrom(store.cambiarContacto(conLista));
      expect(await agregar(store)).toBe('agregado');
      expect(store.activo().lineas[0].precio).toBe(1000);
    });
  });

  describe('cambiar de cliente', () => {
    it('recotiza las líneas y respeta las de precio editado a mano', async () => {
      const { store, precios } = preparar();
      await agregar(store, producto({ id: 1 }));
      await agregar(store, producto({ id: 2, codigo: 'B-02' }));
      store.editarLinea(2, { precio: 1500, cantidad: 1 });
      precios.consultarPrecioItem.mockReturnValue(of(700));

      await lastValueFrom(store.cambiarContacto(conLista));

      const [cafe, editado] = store.activo().lineas;
      expect(cafe.precio).toBe(700);
      expect(editado.precio).toBe(1500);
      expect(precios.consultarPrecioItem).toHaveBeenCalledTimes(1);
    });

    it('volver a un cliente sin lista regresa al precio propio del ítem', async () => {
      const { store, precios } = preparar();
      precios.consultarPrecioItem.mockReturnValue(of(700));
      await lastValueFrom(store.cambiarContacto(conLista));
      await agregar(store);
      await lastValueFrom(store.cambiarContacto({ id: 1, nombre: '222 - Consumidor final' }));
      expect(store.activo().lineas[0].precio).toBe(1000);
    });

    it('el cliente por defecto llega a las ventas sin cliente y a las nuevas', () => {
      const { store } = preparar();
      const consumidor = { id: 1, nombre: '222 - Consumidor final' };
      store.usarContactoPorDefecto(consumidor);
      expect(store.activo().contacto).toEqual(consumidor);
      store.nueva();
      expect(store.activo().contacto).toEqual(consumidor);
    });

    it('el cliente por defecto no pisa uno ya elegido', async () => {
      const { store } = preparar();
      await lastValueFrom(store.cambiarContacto(conLista));
      store.usarContactoPorDefecto({ id: 1, nombre: '222 - Consumidor final' });
      expect(store.activo().contacto?.id).toBe(7);
    });
  });

  describe('cobro pendiente', () => {
    async function conCobroPendiente() {
      const contexto = preparar();
      await agregar(contexto.store);
      contexto.store.registrarCobro(contexto.store.activo().uuid, {
        documentoId: 55,
        pagado: true,
      });
      return contexto;
    }

    it('bloquea la venta: no se agrega, no se cambian cantidades ni se vacía', async () => {
      const { store } = await conCobroPendiente();
      expect(await agregar(store)).toBe('bloqueada');
      expect(store.fijarCantidad(1, 5)).toBe('bloqueada');
      store.editarLinea(1, { precio: 1, cantidad: 9 });
      store.retirarLinea(1);
      store.vaciar(store.activo().uuid);
      expect(cantidad(store)).toBe(1);
      expect(store.activo().lineas[0].precio).toBe(1000);
    });

    it('no deja cerrar la venta: su documento quedaría huérfano', async () => {
      const { store } = await conCobroPendiente();
      expect(store.eliminar(store.activo().uuid)).toBe(false);
      expect(store.carritos()).toHaveLength(1);
      expect(store.cobroPendiente()?.documentoId).toBe(55);
    });

    it('no cambia de cliente', async () => {
      const { store } = await conCobroPendiente();
      await lastValueFrom(store.cambiarContacto(conLista));
      expect(store.activo().contacto).toBeNull();
    });

    it('sobrevive a una recarga con su documento', async () => {
      await conCobroPendiente();
      const recargado = recargar();
      expect(recargado.cobroPendiente()).toEqual({ documentoId: 55, pagado: true });
      expect(await agregar(recargado)).toBe('bloqueada');
    });

    it('al descartarlo la venta vuelve a editarse con sus líneas', async () => {
      const { store } = await conCobroPendiente();
      store.limpiarCobro(store.activo().uuid);
      expect(store.cobroPendiente()).toBeNull();
      expect(store.fijarCantidad(1, 3)).toBe('agregado');
      expect(cantidad(store)).toBe(3);
    });

    it('al terminar el cobro la venta se cierra', async () => {
      const { store } = await conCobroPendiente();
      store.cerrarCobrada(store.activo().uuid);
      expect(store.carritos()).toHaveLength(1);
      expect(store.activo().lineas).toEqual([]);
      expect(store.cobroPendiente()).toBeNull();
    });
  });

  describe('pestañas', () => {
    it('numera las ventas nuevas sin repetir un número abierto', () => {
      const { store } = preparar();
      store.nueva();
      store.nueva();
      store.eliminar(store.carritos()[1].uuid);
      store.nueva();
      expect(store.carritos().map((c) => c.nombre)).toEqual(['Venta 1', 'Venta 3', 'Venta 2']);
    });

    it('al cerrar la activa pasa a la vecina', () => {
      const { store } = preparar();
      store.nueva();
      store.nueva();
      const [, segunda, tercera] = store.carritos();
      store.seleccionar(segunda.uuid);
      store.eliminar(segunda.uuid);
      expect(store.activo().uuid).toBe(tercera.uuid);
    });

    it('cerrar la última abre una nueva vacía', async () => {
      const { store } = preparar();
      await agregar(store);
      store.eliminar(store.activo().uuid);
      expect(store.carritos()).toHaveLength(1);
      expect(store.activo().lineas).toEqual([]);
    });

    it('fijar cantidad en 0 retira la línea', async () => {
      const { store } = preparar();
      await agregar(store);
      expect(store.fijarCantidad(1, 0)).toBe('agregado');
      expect(store.activo().lineas).toEqual([]);
    });

    it('un nombre en blanco no renombra la venta', () => {
      const { store } = preparar();
      store.renombrar(store.activo().uuid, '   ');
      expect(store.activo().nombre).toBe('Venta 1');
      store.renombrar(store.activo().uuid, ' Mesa 4 ');
      expect(store.activo().nombre).toBe('Mesa 4');
    });
  });
});
