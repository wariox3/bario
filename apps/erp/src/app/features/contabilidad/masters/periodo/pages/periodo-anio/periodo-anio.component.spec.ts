import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ENVIRONMENT, I18nService, TenantService, ToastService } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import type { Periodo } from '../../periodo.model';
import { PeriodoAnioComponent } from './periodo-anio.component';

const URL = '/api/contabilidad/periodo/';

const ABIERTO: Periodo = {
  id: 202610,
  anio: 2026,
  mes: 10,
  estado_bloqueado: false,
  estado_cerrado: false,
  estado_inconsistencia: false,
};

describe('PeriodoAnioComponent', () => {
  let fixture: ComponentFixture<PeriodoAnioComponent>;
  let component: PeriodoAnioComponent;
  let http: HttpTestingController;
  const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };

  const periodo = (): Periodo | undefined =>
    component['periodos']().find((p) => p.id === ABIERTO.id);

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [PeriodoAnioComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
        { provide: TenantService, useValue: { currentSlug: () => 'demo' } },
        { provide: ToastService, useValue: toast },
      ],
    });
    // Se prueba la reconciliación del estado, no la plantilla.
    TestBed.overrideComponent(PeriodoAnioComponent, { set: { template: '', imports: [] } });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PeriodoAnioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http
      .expectOne((r) => r.url === URL)
      .flush({ count: 1, next: null, previous: null, results: [ABIERTO] });
  });

  afterEach(() => http.verify());

  it('bloquear con inconsistencias: avisa el detail y trae el periodo como quedó', () => {
    component['bloquear'](ABIERTO);
    // Optimista: se pinta bloqueado mientras responde.
    expect(periodo()?.estado_bloqueado).toBe(true);

    http.expectOne(`${URL}bloquear/`).flush(
      {
        detail: 'El periodo tiene 3 inconsistencias',
        count: 3,
        next: null,
        previous: null,
        results: [],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(toast.error).toHaveBeenCalledWith(
      dictionaries.es.entities.periodo.toasts.bloquearError.title,
      'El periodo tiene 3 inconsistencias',
    );
    // El 400 llega después de que el backend guardó el análisis: se le pregunta cómo quedó.
    http.expectOne(`${URL}${ABIERTO.id}/`).flush({ ...ABIERTO, estado_inconsistencia: true });

    expect(periodo()).toEqual({ ...ABIERTO, estado_inconsistencia: true });
  });

  it('si tampoco se puede consultar el periodo, queda como estaba antes del clic', () => {
    component['bloquear'](ABIERTO);
    http.expectOne(`${URL}bloquear/`).flush('boom', { status: 500, statusText: 'Server Error' });
    http
      .expectOne(`${URL}${ABIERTO.id}/`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(periodo()).toEqual(ABIERTO);
  });
});
