import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { CATALOGO_TTL_MS, CatalogoCacheService, recursoDeCatalogo } from './catalogo-cache.service';

const ALMACEN = '/inventario/almacen/seleccionar/';
const GENERAL = [{ id: 1, nombre: 'General' }];

describe('CatalogoCacheService', () => {
  const slug = signal<string | null>('temporal_3');
  let cache: CatalogoCacheService;
  let consultar: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    slug.set('temporal_3');
    consultar = jest.fn(() => of(GENERAL));
    TestBed.configureTestingModule({
      providers: [{ provide: TenantService, useValue: { currentSlug: slug } }],
    });
    cache = TestBed.inject(CatalogoCacheService);
  });

  afterEach(() => jest.useRealTimers());

  const pedir = (params?: Record<string, string>) =>
    firstValueFrom(cache.obtener(ALMACEN, params, consultar));

  it('el mismo catálogo dentro del TTL sale de una sola consulta', async () => {
    await pedir({ activo: 'True', venta: 'True' });
    await expect(pedir({ venta: 'True', activo: 'True' })).resolves.toEqual(GENERAL);
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it('comparte la consulta en vuelo', () => {
    const respuesta = new Subject<typeof GENERAL>();
    consultar.mockReturnValue(respuesta);
    const recibidos: unknown[] = [];
    cache.obtener(ALMACEN, undefined, consultar).subscribe((o) => recibidos.push(o));
    cache.obtener(ALMACEN, undefined, consultar).subscribe((o) => recibidos.push(o));

    respuesta.next(GENERAL);
    respuesta.complete();

    expect(consultar).toHaveBeenCalledTimes(1);
    expect(recibidos).toEqual([GENERAL, GENERAL]);
  });

  it('vencido el TTL vuelve a consultar', async () => {
    await pedir();
    jest.advanceTimersByTime(CATALOGO_TTL_MS + 1);
    await pedir();
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it('params distintos y tenants distintos no comparten catálogo', async () => {
    await pedir({ activo: 'True' });
    await pedir({ activo: 'False' });
    slug.set('otro_tenant');
    await pedir({ activo: 'True' });
    expect(consultar).toHaveBeenCalledTimes(3);
  });

  it('un error no queda cacheado', async () => {
    consultar.mockReturnValueOnce(throwError(() => new Error('500')));
    await expect(pedir()).rejects.toThrow('500');
    await expect(pedir()).resolves.toEqual(GENERAL);
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it('invalidar descarta solo los catálogos del recurso escrito', async () => {
    const contacto = jest.fn(() => of([{ id: 5, nombre: 'Insumos' }]));
    await pedir();
    await firstValueFrom(cache.obtener('/general/contacto/seleccionar/', undefined, contacto));

    cache.invalidar('/api/inventario/almacen/12/');
    await pedir();
    await firstValueFrom(cache.obtener('/general/contacto/seleccionar/', undefined, contacto));

    expect(consultar).toHaveBeenCalledTimes(2);
    expect(contacto).toHaveBeenCalledTimes(1);
  });

  it('el recurso de un seleccionar es su endpoint sin el sufijo', () => {
    expect(recursoDeCatalogo('/inventario/almacen/seleccionar/')).toBe('/inventario/almacen/');
    expect(recursoDeCatalogo('/general/cuenta-banco/seleccionar')).toBe('/general/cuenta-banco/');
    expect(recursoDeCatalogo('/general/plazo-pago/')).toBe('/general/plazo-pago/');
  });
});
