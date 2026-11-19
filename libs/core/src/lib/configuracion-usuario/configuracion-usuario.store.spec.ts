import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { AUTH_SERVICE } from '../tokens';
import { TenantService } from '../tenant/tenant.service';
import { ConfiguracionUsuarioService } from './configuracion-usuario.service';
import { ConfiguracionUsuarioStore, coincideConOpcion } from './configuracion-usuario.store';
import type { ConfiguracionUsuarioRead } from './configuracion-usuario.model';

const CONFIG: ConfiguracionUsuarioRead = {
  sede: 3,
  sede_nombre: 'Norte',
  almacen: 5,
  almacen_nombre: 'Bodega',
  caja: null,
  caja_nombre: null,
};

describe('ConfiguracionUsuarioStore', () => {
  const slug = signal<string | null>('acme');
  const usuario = signal<{ id: number } | null>({ id: 1 });
  let obtener: jest.Mock;
  let actualizar: jest.Mock;
  let store: ConfiguracionUsuarioStore;

  beforeEach(() => {
    slug.set('acme');
    usuario.set({ id: 1 });
    obtener = jest.fn(() => of(CONFIG));
    actualizar = jest.fn((payload: object) => of({ ...CONFIG, ...payload }));
    TestBed.configureTestingModule({
      providers: [
        { provide: TenantService, useValue: { currentSlug: slug } },
        { provide: AUTH_SERVICE, useValue: { currentUser: usuario } },
        { provide: ConfiguracionUsuarioService, useValue: { obtener, actualizar } },
      ],
    });
    store = TestBed.inject(ConfiguracionUsuarioStore);
  });

  it('pide una sola vez por contenedor y expone las opciones', async () => {
    await firstValueFrom(store.cargar());
    await expect(firstValueFrom(store.cargar())).resolves.toEqual(CONFIG);

    expect(obtener).toHaveBeenCalledTimes(1);
    expect(obtener).toHaveBeenCalledWith({ errorToast: false });
    expect(store.sede()).toEqual({ id: 3, nombre: 'Norte' });
    expect(store.almacen()).toEqual({ id: 5, nombre: 'Bodega' });
    expect(store.caja()).toBeNull();
  });

  it('comparte la petición en vuelo', () => {
    const respuesta = new Subject<ConfiguracionUsuarioRead>();
    obtener.mockReturnValue(respuesta);
    const recibidos: unknown[] = [];
    store.cargar().subscribe((c) => recibidos.push(c));
    store.cargar().subscribe((c) => recibidos.push(c));
    respuesta.next(CONFIG);
    respuesta.complete();

    expect(obtener).toHaveBeenCalledTimes(1);
    expect(recibidos).toEqual([CONFIG, CONFIG]);
  });

  it('al cambiar de contenedor deja de valer y vuelve a pedir', async () => {
    await firstValueFrom(store.cargar());
    slug.set('otra');

    expect(store.config()).toBeNull();
    await firstValueFrom(store.cargar());
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it('al cambiar de usuario deja de valer', async () => {
    await firstValueFrom(store.cargar());
    usuario.set({ id: 2 });

    expect(store.config()).toBeNull();
  });

  it('un error emite null, no se cachea y el siguiente reintenta', async () => {
    obtener.mockReturnValueOnce(throwError(() => new Error('500')));

    await expect(firstValueFrom(store.cargar())).resolves.toBeNull();
    expect(store.config()).toBeNull();
    await expect(firstValueFrom(store.cargar())).resolves.toEqual(CONFIG);
    expect(obtener).toHaveBeenCalledTimes(2);
  });

  it('sin contenedor no pide nada', async () => {
    slug.set(null);

    await expect(firstValueFrom(store.cargar())).resolves.toBeNull();
    expect(obtener).not.toHaveBeenCalled();
  });

  it('establecer reemplaza la copia sin pedir', async () => {
    store.establecer({ ...CONFIG, sede: 9, sede_nombre: 'Sur' });

    expect(store.sede()).toEqual({ id: 9, nombre: 'Sur' });
    await firstValueFrom(store.cargar());
    expect(obtener).not.toHaveBeenCalled();
  });

  it('estado: cargando hasta que llega, listo después', async () => {
    const respuesta = new Subject<ConfiguracionUsuarioRead>();
    obtener.mockReturnValue(respuesta);
    store.cargar().subscribe();
    expect(store.estado()).toBe('cargando');

    respuesta.next(CONFIG);
    respuesta.complete();
    expect(store.estado()).toBe('listo');
  });

  it('estado: error si falla, y vuelve a cargando al reintentar', () => {
    const respuesta = new Subject<ConfiguracionUsuarioRead>();
    obtener.mockReturnValueOnce(throwError(() => new Error('500'))).mockReturnValueOnce(respuesta);
    store.cargar().subscribe();
    expect(store.estado()).toBe('error');

    store.cargar().subscribe();
    expect(store.estado()).toBe('cargando');
  });

  it('estado: el error de un contenedor no vale para otro', () => {
    obtener.mockReturnValueOnce(throwError(() => new Error('500')));
    store.cargar().subscribe();
    slug.set('otra');

    expect(store.estado()).toBe('cargando');
  });

  it('guardar manda el PATCH y deja la copia con la respuesta', async () => {
    await firstValueFrom(store.guardar({ sede: null }));

    expect(actualizar).toHaveBeenCalledWith({ sede: null });
    expect(store.sede()).toBeNull();
    expect(store.almacen()).toEqual({ id: 5, nombre: 'Bodega' });
    expect(obtener).not.toHaveBeenCalled();
  });
});

describe('coincideConOpcion', () => {
  it('sin valor por defecto no hay criterio', () => {
    expect(coincideConOpcion(null)).toBeNull();
  });

  it('casa por id', () => {
    const match = coincideConOpcion({ id: 3, nombre: '' });
    expect(match?.({ id: 3, nombre: 'Norte' })).toBe(true);
    expect(match?.({ id: 4, nombre: 'Sur' })).toBe(false);
  });
});
