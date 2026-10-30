import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { lastValueFrom } from 'rxjs';
import { ENVIRONMENT, TenantService } from '@reddoc/core';
import { CatalogosCobroService } from './catalogos-cobro.service';
import { CatalogoCobroError } from './cobro.model';

const METODOS = '/api/general/metodo-pago/seleccionar/';

describe('CatalogosCobroService', () => {
  function preparar() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: TenantService, useValue: { currentSlug: signal('acme') } },
      ],
    });
    return {
      service: TestBed.inject(CatalogosCobroService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('busca el método por su código y se queda con el exacto', async () => {
    const { service, http } = preparar();
    const metodo = lastValueFrom(service.metodoPago('10'));
    const req = http.expectOne((r) => r.url === METODOS);
    expect(req.request.params.get('search')).toBe('10');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({
      next: null,
      results: [
        { id: 7, nombre: 'Instrumento 100', codigo: '100' },
        { id: 3, nombre: 'Efectivo', codigo: '10' },
      ],
    });
    await expect(metodo).resolves.toEqual({ id: 3, nombre: 'Efectivo' });
  });

  it('sigue a la página siguiente sin perder la búsqueda', async () => {
    const { service, http } = preparar();
    const metodo = lastValueFrom(service.metodoPago('47'));
    http
      .expectOne((r) => r.url === METODOS && r.params.get('page') === '1')
      .flush({ next: 'p2', results: [{ id: 1, nombre: 'Otro', codigo: '470' }] });
    const segunda = http.expectOne((r) => r.url === METODOS && r.params.get('page') === '2');
    expect(segunda.request.params.get('search')).toBe('47');
    segunda.flush({ next: null, results: [{ id: 5, nombre: 'Transferencia', codigo: '47' }] });
    await expect(metodo).resolves.toEqual({ id: 5, nombre: 'Transferencia' });
  });

  it('si el tenant no lo tiene, el error lleva el código que faltó', async () => {
    const { service, http } = preparar();
    const metodo = lastValueFrom(service.metodoPago('47'));
    http.expectOne((r) => r.url === METODOS).flush({ next: null, results: [] });
    await expect(metodo).rejects.toBeInstanceOf(CatalogoCobroError);
    await expect(metodo).rejects.toMatchObject({ falta: 'metodoPago', codigoDian: '47' });
  });
});
