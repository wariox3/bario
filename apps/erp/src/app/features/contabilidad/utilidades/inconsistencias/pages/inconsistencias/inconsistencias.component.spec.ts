import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  ENVIRONMENT,
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { DataTableComponent } from '@reddoc/feature-base';
import { dictionaries } from '@erp/i18n';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';
import { ACCION_RESOLVER, ROW_ACTIONS } from '../../inconsistencias.constants';
import { InconsistenciasComponent } from './inconsistencias.component';

const SELECCIONAR = '/api/contabilidad/periodo/seleccionar/';

function inconsistencia(
  id: number,
  descripcion: string,
  resolverAutomatico = true,
): InconsistenciaGuardada {
  return {
    id,
    numero: null,
    descripcion,
    fecha: '2026-10-29T10:00:00Z',
    inconsistencia_tipo: 8,
    inconsistencia_tipo_nombre: 'Sobra base',
    inconsistencia_tipo_resolver_automatico: resolverAutomatico,
    periodo: 3,
    comprobante: null,
    comprobante_nombre: null,
    movimiento: null,
    movimiento_cuenta_codigo: null,
    documento: null,
    documento_documento_tipo_nombre: null,
  };
}

/** Página de la respuesta de `analizar/`. */
function pagina(count: number, results: InconsistenciaGuardada[]) {
  return { count, next: null, previous: null, results };
}

describe('InconsistenciasComponent', () => {
  let fixture: ComponentFixture<InconsistenciasComponent>;
  let component: InconsistenciasComponent;
  let http: HttpTestingController;

  const d = dictionaries.es.entities.inconsistencias;
  const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  // jsdom no descarga archivos: basta con ver qué se pidió.
  const descarga = { download: jest.fn(() => of(undefined)) };
  const texto = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InconsistenciasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
        { provide: TenantService, useValue: { currentSlug: () => 'demo' } },
        { provide: ToastService, useValue: toast },
        { provide: FileDownloadService, useValue: descarga },
      ],
    });
    // La tabla de PrimeNG no aporta a lo que se prueba: queda como etiqueta muda.
    TestBed.overrideComponent(InconsistenciasComponent, {
      remove: { imports: [DataTableComponent] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InconsistenciasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  /** Responde el catálogo de periodos abiertos. */
  function periodos(): void {
    http
      .expectOne((r) => r.url === SELECCIONAR)
      .flush({
        count: 3,
        next: null,
        previous: null,
        results: [
          { id: 1, anio: 2025, mes: 12 },
          { id: 3, anio: 2026, mes: 10 },
          { id: 2, anio: 2026, mes: 9 },
        ],
      });
    fixture.detectChanges();
  }

  /** Elige el periodo y pulsa Analizar; devuelve la petición pendiente. */
  function analizar(id: number) {
    component['onPeriodo'](id);
    component['onAnalizar']();
    fixture.detectChanges();
    return http.expectOne((r) => r.url === `/api/contabilidad/periodo/${id}/analizar/`);
  }

  it('ofrece solo los periodos sin bloquear, del más reciente al más viejo', () => {
    const req = http.expectOne((r) => r.url === SELECCIONAR);
    expect(req.request.params.get('estado_bloqueado')).toBe('false');
    req.flush({
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 1, anio: 2025, mes: 12 },
        { id: 2, anio: 2026, mes: 9 },
      ],
    });

    expect(component['opciones']().map((o) => o.nombre)).toEqual([
      'Septiembre 2026',
      'Diciembre 2025',
    ]);
  });

  it('antes de analizar explica qué hace y no pide nada más', () => {
    periodos();

    expect(texto()).toContain(d.inicial);
  });

  it('analiza con POST y muestra cuántas encontró', () => {
    periodos();

    const req = analizar(3);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('page')).toBe('1');
    expect(texto()).toContain(d.analizando);
    req.flush(pagina(30, [inconsistencia(1, 'Descuadre'), inconsistencia(2, 'Sin cuenta')]));
    fixture.detectChanges();

    // El total sale de `count`, no de las filas de la página.
    expect(texto()).toContain('30 inconsistencias en Octubre 2026');
  });

  it('cambiar de página pide esa página del análisis', () => {
    periodos();
    analizar(3).flush(pagina(30, [inconsistencia(1, 'Descuadre')]));
    fixture.detectChanges();

    component['onPageChange']({ page: 1 });
    const req = http.expectOne((r) => r.url === '/api/contabilidad/periodo/3/analizar/');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(pagina(30, [inconsistencia(26, 'Otra')]));

    expect(component['items']().map((i) => i.id)).toEqual([26]);
  });

  it('sin inconsistencias avisa que el periodo se puede bloquear', () => {
    periodos();

    analizar(2).flush(pagina(0, []));
    fixture.detectChanges();

    expect(texto()).toContain(d.sinInconsistencias.title);
    expect(texto()).toContain('Septiembre 2026 ya se puede bloquear.');
  });

  it('cambiar de periodo borra el resultado anterior', () => {
    periodos();
    analizar(2).flush(pagina(1, [inconsistencia(1, 'Descuadre')]));

    component['onPeriodo'](3);
    fixture.detectChanges();

    expect(texto()).not.toContain('Septiembre 2026');
    expect(texto()).toContain(d.inicial);
  });

  it('si falla el análisis lo dice', () => {
    periodos();

    analizar(2).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(texto()).toContain(d.error);
  });

  it('el botón Resolver solo aparece en las que el backend sabe corregir', () => {
    periodos();
    const resolver = ROW_ACTIONS.find((a) => a.id === ACCION_RESOLVER);

    expect(resolver?.visibleFor?.(inconsistencia(1, 'Sobra base'))).toBe(true);
    expect(resolver?.visibleFor?.(inconsistencia(2, 'Descuadre', false))).toBe(false);
  });

  it('resolver confirma, manda el id y vuelve a analizar la página', () => {
    periodos();
    const fila = inconsistencia(7, 'Sobra base');
    analizar(3).flush(pagina(2, [fila, inconsistencia(8, 'Descuadre', false)]));
    fixture.detectChanges();
    // El diálogo lo provee el componente: se acepta en cuanto se pide.
    const confirmacion = fixture.debugElement.injector.get(ConfirmationService);
    jest
      .spyOn(confirmacion, 'confirm')
      .mockImplementation((c: Confirmation) => (c.accept?.(), confirmacion));

    component['onRowAction']({ actionId: ACCION_RESOLVER, row: fila });

    const req = http.expectOne('/api/contabilidad/inconsistencia/resolver/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id: 7 });
    req.flush(null, { status: 204, statusText: 'No Content' });

    const reanalisis = http.expectOne((r) => r.url === '/api/contabilidad/periodo/3/analizar/');
    expect(reanalisis.request.params.get('page')).toBe('1');
    reanalisis.flush(pagina(1, [inconsistencia(8, 'Descuadre', false)]));
    expect(toast.success).toHaveBeenCalled();
    expect(component['totalCount']()).toBe(1);
  });

  it('el Excel se habilita tras analizar y exporta lo guardado del periodo', () => {
    periodos();
    component['onPeriodo'](3);
    expect(component['puedeExportar']()).toBe(false);

    analizar(3).flush(pagina(1, [inconsistencia(1, 'Descuadre')]));
    expect(component['puedeExportar']()).toBe(true);
    component['onExportarExcel']();

    expect(descarga.download).toHaveBeenCalledWith(
      '/contabilidad/inconsistencia/excel/',
      expect.objectContaining({
        method: 'POST',
        body: {
          filtros: [{ propiedad: 'periodo_id', operador: '=', valor: 3 }],
          ordenamientos: [],
        },
      }),
    );
  });
});
