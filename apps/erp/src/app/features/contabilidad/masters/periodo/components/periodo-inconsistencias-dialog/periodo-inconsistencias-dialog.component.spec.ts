import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { ENVIRONMENT, FileDownloadService, I18nService, ToastService } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import type { Periodo } from '../../periodo.model';
import { PeriodoInconsistenciasDialogComponent } from './periodo-inconsistencias-dialog.component';

const LISTA = '/api/contabilidad/inconsistencia/lista/';

const OCTUBRE: Periodo = {
  id: 202610,
  anio: 2026,
  mes: 10,
  estado_bloqueado: false,
  estado_cerrado: false,
  estado_inconsistencia: true,
};

describe('PeriodoInconsistenciasDialogComponent', () => {
  let fixture: ComponentFixture<PeriodoInconsistenciasDialogComponent>;
  let component: PeriodoInconsistenciasDialogComponent;
  let http: HttpTestingController;
  const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  // jsdom no descarga archivos: basta con ver qué se pidió.
  const descarga = { download: jest.fn(() => of(undefined)) };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [PeriodoInconsistenciasDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
        { provide: ToastService, useValue: toast },
        { provide: FileDownloadService, useValue: descarga },
      ],
    });
    // Se prueba la carga y la exportación, no el chrome de PrimeNG.
    TestBed.overrideComponent(PeriodoInconsistenciasDialogComponent, {
      set: { template: '', imports: [] },
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PeriodoInconsistenciasDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('periodo', OCTUBRE);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  /** Abre el diálogo y devuelve la petición de la primera página. */
  function abrir() {
    component.visible.set(true);
    fixture.detectChanges();
    return http.expectOne((r) => r.url === LISTA);
  }

  it('cerrado no pide nada', () => {
    http.expectNone((r) => r.url === LISTA);
  });

  it('al abrir lee lo guardado del periodo, una página: no trae todo', () => {
    const req = abrir();

    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.body).toEqual({
      filtros: [{ propiedad: 'periodo_id', operador: '=', valor: OCTUBRE.id }],
      ordenamientos: [],
    });
    req.flush({ count: 30, next: `${LISTA}?page=2`, previous: null, results: [] });

    expect(component['totalCount']()).toBe(30);
    expect(component['nombrePeriodo']()).toBe('Octubre 2026');
  });

  it('cambiar de página pide esa página', () => {
    abrir().flush({ count: 30, next: `${LISTA}?page=2`, previous: null, results: [] });

    component['onPageChange']({ page: 1 });

    const req = http.expectOne((r) => r.url === LISTA);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ count: 30, next: null, previous: `${LISTA}?page=1`, results: [] });
  });

  it('el Excel exporta lo guardado del periodo', () => {
    abrir().flush({ count: 1, next: null, previous: null, results: [] });

    component['exportarExcel']();

    expect(descarga.download).toHaveBeenCalledWith(
      '/contabilidad/inconsistencia/excel/',
      expect.objectContaining({
        method: 'POST',
        body: {
          filtros: [{ propiedad: 'periodo_id', operador: '=', valor: OCTUBRE.id }],
          ordenamientos: [],
        },
      }),
    );
  });

  it('al cerrar se vacía, para no mostrar el periodo anterior en la próxima apertura', () => {
    abrir().flush({ count: 1, next: null, previous: null, results: [] });

    component.visible.set(false);
    fixture.detectChanges();

    expect(component['totalCount']()).toBe(0);
  });
});
