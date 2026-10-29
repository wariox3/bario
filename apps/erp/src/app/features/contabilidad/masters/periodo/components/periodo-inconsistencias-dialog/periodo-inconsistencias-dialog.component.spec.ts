import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { ENVIRONMENT, FileDownloadService, I18nService, ToastService } from '@reddoc/core';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { dictionaries } from '@erp/i18n';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';
import {
  ACCION_RESOLVER,
  ROW_ACTIONS,
} from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.constants';
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

function fila(id: number, resolverAutomatico: boolean): InconsistenciaGuardada {
  return {
    id,
    numero: null,
    descripcion: 'Sobra base',
    fecha: '2026-10-29T10:00:00Z',
    inconsistencia_tipo: 8,
    inconsistencia_tipo_nombre: 'Sobra base',
    inconsistencia_tipo_resolver_automatico: resolverAutomatico,
    periodo: OCTUBRE.id,
    comprobante: null,
    comprobante_nombre: null,
    movimiento: null,
    movimiento_cuenta_codigo: null,
    documento: null,
    documento_documento_tipo_nombre: null,
  };
}

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

  it('ofrece Resolver con la misma acción que la utilidad', () => {
    expect(component['rowActions']).toBe(ROW_ACTIONS);
    const resolver = ROW_ACTIONS.find((a) => a.id === ACCION_RESOLVER);
    expect(resolver?.visibleFor?.(fila(1, true))).toBe(true);
    expect(resolver?.visibleFor?.(fila(2, false))).toBe(false);
  });

  it('resolver confirma, manda el id y recarga la página sin reanalizar', () => {
    const resoluble = fila(7, true);
    abrir().flush({ count: 2, next: null, previous: null, results: [resoluble, fila(8, false)] });
    // El diálogo trae su propia confirmación: se acepta en cuanto se pide.
    const confirmacion = fixture.debugElement.injector.get(ConfirmationService);
    jest
      .spyOn(confirmacion, 'confirm')
      .mockImplementation((c: Confirmation) => (c.accept?.(), confirmacion));

    component['onRowAction']({ actionId: ACCION_RESOLVER, row: resoluble });

    const req = http.expectOne('/api/contabilidad/inconsistencia/resolver/');
    expect(req.request.body).toEqual({ id: 7 });
    req.flush(null, { status: 204, statusText: 'No Content' });

    http.expectNone((r) => r.url.includes('/analizar/'));
    const recarga = http.expectOne((r) => r.url === LISTA);
    expect(recarga.request.params.get('page')).toBe('1');
    recarga.flush({ count: 1, next: null, previous: null, results: [fila(8, false)] });
    expect(toast.success).toHaveBeenCalled();
    expect(component['totalCount']()).toBe(1);
  });
});
