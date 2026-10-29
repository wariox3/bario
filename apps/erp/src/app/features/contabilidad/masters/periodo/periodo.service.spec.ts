import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@reddoc/core';
import type { Periodo } from './periodo.model';
import { PeriodoService } from './periodo.service';

const URL = '/api/contabilidad/periodo/';

function periodo(id: number): Periodo {
  return {
    id,
    anio: Math.floor(id / 100),
    mes: id % 100,
    estado_bloqueado: false,
    estado_cerrado: false,
    estado_inconsistencia: false,
  };
}

describe('PeriodoService', () => {
  let service: PeriodoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    service = TestBed.inject(PeriodoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listAll recorre todas las páginas: con dos años ya no caben en una', () => {
    let ids: number[] = [];
    service.listAll().subscribe((periodos) => (ids = periodos.map((p) => p.id)));

    const primera = http.expectOne((r) => r.url === URL && r.params.get('page') === '1');
    primera.flush({
      count: 26,
      next: `${URL}?page=2`,
      previous: null,
      results: [periodo(202613), periodo(202502)],
    });
    http
      .expectOne((r) => r.url === URL && r.params.get('page') === '2')
      .flush({ count: 26, next: null, previous: `${URL}?page=1`, results: [periodo(202501)] });

    expect(ids).toEqual([202613, 202502, 202501]);
  });

  it('listAll devuelve un arreglo aunque el vacío llegue nulo', () => {
    let periodos: readonly Periodo[] | undefined;
    service.listAll().subscribe((p) => (periodos = p));

    http.expectOne((r) => r.url === URL).flush(null);

    expect(periodos).toEqual([]);
  });
});
