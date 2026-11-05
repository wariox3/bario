import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { lastValueFrom } from 'rxjs';
import { ENVIRONMENT, TenantService } from '@reddoc/core';
import { CatalogosCobroService } from './catalogos-cobro.service';
import { CatalogoCobroError } from './cobro.model';

const PLAZOS = '/api/general/plazo-pago/seleccionar/';

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

  it('busca el plazo de 0 días recorriendo páginas', async () => {
    const { service, http } = preparar();
    const plazo = lastValueFrom(service.plazoContado());
    http
      .expectOne((r) => r.url === PLAZOS && r.params.get('page') === '1')
      .flush({ next: 'p2', results: [{ id: 4, nombre: '30 días', dias: 30 }] });
    http
      .expectOne((r) => r.url === PLAZOS && r.params.get('page') === '2')
      .flush({ next: null, results: [{ id: 1, nombre: 'Contado', dias: 0 }] });
    await expect(plazo).resolves.toEqual({ id: 1, nombre: 'Contado' });
  });

  it('si el tenant no lo tiene, falla con el plazo que faltó', async () => {
    const { service, http } = preparar();
    const plazo = lastValueFrom(service.plazoContado());
    http.expectOne((r) => r.url === PLAZOS).flush({ next: null, results: [] });
    await expect(plazo).rejects.toBeInstanceOf(CatalogoCobroError);
    await expect(plazo).rejects.toMatchObject({ falta: 'plazoContado' });
  });
});
