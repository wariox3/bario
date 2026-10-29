import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChartModule } from 'primeng/chart';
import { ENVIRONMENT, I18nService } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import { EstadoResultadosTableroComponent } from './estado-resultados-tablero.component';
import type { EstadoResultadosTablero, FilaCascada } from './estado-resultados-tablero.model';

const URL = '/api/contabilidad/tablero/estado-resultados/';

function respuesta(valores: readonly number[]): EstadoResultadosTablero {
  const tipos: FilaCascada['tipo'][] = [
    'entrada',
    'salida',
    'subtotal',
    'salida',
    'subtotal',
    'entrada',
    'salida',
    'total',
  ];
  const claves: FilaCascada['clave'][] = [
    'ventas',
    'costo_ventas',
    'utilidad_bruta',
    'gastos_operacion',
    'utilidad_operacional',
    'otros_netos',
    'impuestos',
    'utilidad_neta',
  ];
  const neta = valores.at(-1) ?? 0;
  return {
    fecha_desde: '2026-07-01',
    fecha_hasta: '2026-08-15',
    tarjetas: { vendimos: valores[0] ?? 0, gastamos: 0, nos_quedo: neta, margen_neto: null },
    cascada: claves.map((clave, i) => ({
      clave,
      etiqueta: clave,
      valor: valores[i] ?? 0,
      tipo: tipos[i] ?? 'entrada',
    })),
    comparativo: {
      fecha_desde: '2025-07-01',
      fecha_hasta: '2025-08-15',
      vendimos: 0,
      gastamos: 0,
      nos_quedo: 0,
    },
  };
}

describe('EstadoResultadosTableroComponent', () => {
  let fixture: ComponentFixture<EstadoResultadosTableroComponent>;
  let http: HttpTestingController;

  const texto = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const tx = dictionaries.es.inicio.estadoResultados;

  beforeEach(() => {
    // Hoy fijo a mitad del tercer trimestre: mes, trimestre y año arrancan en días distintos.
    jest.useFakeTimers({ now: new Date(2026, 7, 15, 10, 30), doNotFake: ['queueMicrotask'] });
    TestBed.configureTestingModule({
      imports: [EstadoResultadosTableroComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
      ],
    });
    TestBed.overrideComponent(EstadoResultadosTableroComponent, {
      // jsdom no tiene canvas: sin ChartModule, `p-chart` queda como un elemento mudo.
      remove: { imports: [ChartModule] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstadoResultadosTableroComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
  });

  /** Elige una opción del selector de período por su texto. */
  function elegir(opcion: string): void {
    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === opcion,
    );
    boton?.click();
    fixture.detectChanges();
  }

  it('arranca en el mes en curso hasta hoy y muestra el esqueleto mientras carga', () => {
    const req = http.expectOne((r) => r.url === URL);

    expect(req.request.params.get('fecha_desde')).toBe('2026-08-01');
    expect(req.request.params.get('fecha_hasta')).toBe('2026-08-15');
    const section = (fixture.nativeElement as HTMLElement).querySelector('section');
    expect(section?.getAttribute('aria-busy')).toBe('true');
    expect(texto()).not.toContain(tx.tarjetas.vendimos);

    req.flush(respuesta([1000, -400, 600, -300, 300, 50, -100, 250]));
  });

  it.each([
    ['trimestre', '2026-07-01'],
    ['anio', '2026-01-01'],
  ] as const)('al pasar a %s pide desde %s hasta hoy', (periodo, desde) => {
    http.expectOne((r) => r.url === URL).flush(respuesta([0]));
    fixture.detectChanges();

    elegir(dictionaries.es.inicio.periodo[periodo]);

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('fecha_desde')).toBe(desde);
    expect(req.request.params.get('fecha_hasta')).toBe('2026-08-15');
    req.flush(respuesta([0]));
  });

  it('rotula el trimestre con su número y el año', () => {
    http.expectOne((r) => r.url === URL).flush(respuesta([0]));
    fixture.detectChanges();
    elegir(dictionaries.es.inicio.periodo.trimestre);

    http.expectOne((r) => r.url === URL).flush(respuesta([0]));
    fixture.detectChanges();

    expect(texto()).toContain('trimestre 3 de 2026');
  });

  it('con datos pinta las tarjetas y la gráfica', () => {
    http
      .expectOne((r) => r.url === URL)
      .flush(respuesta([1000, -400, 600, -300, 300, 50, -100, 250]));
    fixture.detectChanges();

    expect(texto()).toContain(tx.tarjetas.nos_quedo);
    expect((fixture.nativeElement as HTMLElement).querySelector('p-chart')).not.toBeNull();
    expect(texto()).not.toContain(tx.sinMovimiento);
  });

  it('todo en cero muestra el estado vacío sin gráfica', () => {
    http.expectOne((r) => r.url === URL).flush(respuesta([0, 0, 0, 0, 0, 0, 0, 0]));
    fixture.detectChanges();

    expect(texto()).toContain(tx.sinMovimiento);
    expect((fixture.nativeElement as HTMLElement).querySelector('p-chart')).toBeNull();
  });

  it('si falla muestra el error y no deja cifras de otro período', () => {
    http.expectOne((r) => r.url === URL).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(texto()).toContain(tx.error.title);
    expect(texto()).not.toContain(tx.tarjetas.vendimos);
  });
});
