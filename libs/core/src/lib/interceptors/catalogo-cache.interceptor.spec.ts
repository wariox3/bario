import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogoCacheService } from '../data/catalogo-cache.service';
import { catalogoCacheInterceptor } from './catalogo-cache.interceptor';

describe('catalogoCacheInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let invalidar: jest.Mock;

  beforeEach(() => {
    invalidar = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([catalogoCacheInterceptor])),
        provideHttpClientTesting(),
        { provide: CatalogoCacheService, useValue: { invalidar } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('una escritura exitosa invalida su recurso', () => {
    http.post('/api/general/contacto/', {}).subscribe();
    backend.expectOne('/api/general/contacto/').flush({ id: 9 });
    expect(invalidar).toHaveBeenCalledWith('/api/general/contacto/');
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('%s también invalida', (method) => {
    http.request(method, '/api/inventario/almacen/3/', { body: {} }).subscribe();
    backend.expectOne('/api/inventario/almacen/3/').flush({});
    expect(invalidar).toHaveBeenCalledWith('/api/inventario/almacen/3/');
  });

  it('una lectura no invalida', () => {
    http.get('/api/inventario/almacen/seleccionar/').subscribe();
    backend.expectOne('/api/inventario/almacen/seleccionar/').flush({ results: [] });
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('una escritura fallida no invalida', () => {
    http.post('/api/general/contacto/', {}).subscribe({ error: () => undefined });
    backend
      .expectOne('/api/general/contacto/')
      .flush({ detail: 'inválido' }, { status: 400, statusText: 'Bad Request' });
    expect(invalidar).not.toHaveBeenCalled();
  });
});
