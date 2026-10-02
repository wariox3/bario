import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ENVIRONMENT, TenantService } from '@reddoc/core';
import { ProgramacionService, cuerpoExportacion } from './programacion.service';

describe('ProgramacionService · listarRenglones', () => {
  let service: ProgramacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    TestBed.inject(TenantService).setSlug('acme');
    service = TestBed.inject(ProgramacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide por POST a lista/: la raíz del recurso no acepta GET', () => {
    service.listarRenglones(7, 0, 25).subscribe();
    const req = http.expectOne((r) => r.url === '/api/humano/programacion-detalle/lista/');
    expect(req.request.method).toBe('POST');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('filtra por la programación y ordena por contrato en el cuerpo', () => {
    service.listarRenglones(7, 0, 25).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/programacion-detalle/lista/'));
    expect(req.request.body).toEqual({
      filtros: [{ propiedad: 'programacion_id', operador: '=', valor: 7 }],
      ordenamientos: ['contrato_id'],
    });
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('recibe la página 0-based y la manda 1-based', () => {
    service.listarRenglones(7, 2, 25).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/programacion-detalle/lista/'));
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('limit')).toBe('25');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });
});

describe('ProgramacionService · acciones sobre la programación', () => {
  let service: ProgramacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    TestBed.inject(TenantService).setSlug('acme');
    service = TestBed.inject(ProgramacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    ['cargar-contrato', (s: ProgramacionService) => s.cargarContratos(7)],
    ['generar', (s: ProgramacionService) => s.generar(7)],
    ['desgenerar', (s: ProgramacionService) => s.desgenerar(7)],
    ['aprobar', (s: ProgramacionService) => s.aprobar(7)],
    ['desaprobar', (s: ProgramacionService) => s.desaprobar(7)],
    ['notificar', (s: ProgramacionService) => s.notificar(7)],
  ])('%s identifica la programación con programacion_id', (accion, llamar) => {
    llamar(service).subscribe();
    const req = http.expectOne(`/api/humano/programacion/${accion}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ programacion_id: 7 });
    req.flush({});
  });

  it('ajusta un renglón por PATCH: el modal manda solo lo que edita', () => {
    service.actualizarRenglon(3, { diurna: 8 }).subscribe();
    const req = http.expectOne('/api/humano/programacion-detalle/3/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ diurna: 8 });
    req.flush({});
  });

  it('elimina los renglones elegidos en una sola petición', () => {
    service.eliminarRenglones(7, [11, 12]).subscribe();
    const req = http.expectOne('/api/humano/programacion/eliminar-detalle/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ programacion_id: 7, ids: [11, 12] });
    req.flush({});
  });

  it('sin renglones elegidos no pide nada: sin ids el backend borraría todos', () => {
    let terminado = false;
    service.eliminarRenglones(7, []).subscribe({ complete: () => (terminado = true) });
    http.expectNone('/api/humano/programacion/eliminar-detalle/');
    expect(terminado).toBe(true);
  });
});

describe('ProgramacionService · nominaDelRenglon', () => {
  let service: ProgramacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    TestBed.inject(TenantService).setSlug('acme');
    service = TestBed.inject(ProgramacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca por POST lista/ con el renglón en filtros: el GET ignora el filtro', () => {
    service.nominaDelRenglon(42).subscribe();
    const req = http.expectOne((r) => r.url === '/api/general/documento/lista/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      filtros: [{ propiedad: 'programacion_detalle_id', operador: '=', valor: 42 }],
      ordenamientos: [],
    });
    expect(req.request.params.get('limit')).toBe('1');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });
});

describe('cuerpoExportacion', () => {
  it('acota las nóminas a la programación dentro de filtros, no suelto en el cuerpo', () => {
    expect(cuerpoExportacion('nomina', 7)).toEqual({
      filtros: [{ propiedad: 'programacion_detalle__programacion_id', operador: '=', valor: 7 }],
      ordenamientos: [],
      serializador: 'informe_nomina',
    });
  });

  it('cada exportación usa su filtro y su serializador', () => {
    expect(cuerpoExportacion('renglones', 7).filtros[0].propiedad).toBe('programacion_id');
    expect(cuerpoExportacion('nominaDetalle', 7)).toMatchObject({
      filtros: [{ propiedad: 'documento__programacion_detalle__programacion_id', valor: 7 }],
      serializador: 'informe_nomina_detalle',
    });
  });
});
