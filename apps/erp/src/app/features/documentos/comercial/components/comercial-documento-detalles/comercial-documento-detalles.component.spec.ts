import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from 'primeng/dynamicdialog';
import type { Popover } from 'primeng/popover';
import { of } from 'rxjs';
import {
  ENVIRONMENT,
  ErpSelectDataService,
  I18nService,
  ToastService,
  comercialDetalleToFormValue,
  type ComercialDetalleRead,
} from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '../../comercial-documento-detalle.form';
import { LineasEnCursoError } from '../../../lineas-diferidas';
import { ErpItemAutocompleteComponent } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ComercialDocumentoDetallesComponent } from './comercial-documento-detalles.component';

const URL = '/api/general/documento-detalle/';
const ITEM = { id: 5, nombre: 'Tornillo', precio: 100 };

/** Línea ya persistida (con `id`), como llega al abrir un documento en edición. */
function persistida(id: number): ComercialDetalleGroup {
  return createComercialDetalleGroup({ id, item: ITEM, cantidad: 1, precio: 100 });
}

/** Línea nueva con ítem: pendiente hasta que se guarde. */
function nueva(precio = 100): ComercialDetalleGroup {
  return createComercialDetalleGroup({ item: ITEM, cantidad: 1, precio });
}

/** Respuesta mínima del backend para una línea guardada. */
function leida(id: number): ComercialDetalleRead {
  return {
    id,
    item: 5,
    item_nombre: 'Tornillo',
    cantidad: 1,
    precio: '100.00',
  } as unknown as ComercialDetalleRead;
}

describe('ComercialDocumentoDetallesComponent — guardado diferido', () => {
  let fixture: ComponentFixture<ComercialDocumentoDetallesComponent>;
  let component: ComercialDocumentoDetallesComponent;
  let http: HttpTestingController;

  /** Monta la tabla sin template: se prueba la lógica de guardado, no PrimeNG. */
  function montar(documentId: number | null, filas: ComercialDetalleGroup[]): void {
    fixture = TestBed.createComponent(ComercialDocumentoDetallesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('detalles', new FormArray<ComercialDetalleGroup>(filas));
    fixture.componentRef.setInput('documentId', documentId);
    fixture.detectChanges();
  }

  /** Quita una fila como lo hace el botón de la papelera tras confirmar. */
  function quitar(fila: ComercialDetalleGroup): void {
    component['lineas'].quitar(fila);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ComercialDocumentoDetallesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
        {
          provide: ToastService,
          useValue: { success: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        // Catálogo de impuestos vacío: las líneas conservan sus montos.
        { provide: ErpSelectDataService, useValue: { fetchOptions: () => of([]) } },
        { provide: DialogService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(ComercialDocumentoDetallesComponent, {
      set: { template: '', imports: [] },
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pendingCount responde 0 antes de recibir sus inputs (el padre lo lee desde arriba)', () => {
    fixture = TestBed.createComponent(ComercialDocumentoDetallesComponent);
    expect(fixture.componentInstance.pendingCount()).toBe(0);
  });

  it('quitar una línea persistida no llama a la API hasta guardar', () => {
    const fila = persistida(1);
    montar(10, [fila]);

    quitar(fila);

    http.expectNone(`${URL}1/`);
    expect(component.detalles().length).toBe(0);
    expect(component.pendingCount()).toBe(1);

    let completo = false;
    component.saveAll().subscribe({ complete: () => (completo = true) });
    http.expectOne({ method: 'DELETE', url: `${URL}1/` }).flush(null);

    expect(completo).toBe(true);
    expect(component.pendingCount()).toBe(0);
  });

  it('si una línea falla, las demás terminan y reintentar no duplica las guardadas', () => {
    const buena = nueva(100);
    const mala = nueva(200);
    montar(10, [buena, mala]);
    let error: unknown = null;

    component.saveAll().subscribe({ error: (err: unknown) => (error = err) });
    const [req1, req2] = http.match({ method: 'POST', url: URL });
    req1.flush(leida(1));
    req2.flush({ detail: 'x' }, { status: 400, statusText: 'Bad Request' });

    expect(error).not.toBeNull();
    // La guardada quedó con su id; solo la que falló sigue pendiente.
    expect(component.detalles().at(0).controls.id.value).toBe(1);
    expect(component.pendingCount()).toBe(1);

    component.saveAll().subscribe();
    const reintento = http.expectOne({ method: 'POST', url: URL });
    expect(reintento.request.body.precio).toBe('200.00');
    reintento.flush(leida(2));
    expect(component.pendingCount()).toBe(0);
  });

  it('una línea persistida sin tocar no queda pendiente ni viaja al guardar', () => {
    montar(10, [persistida(1)]);

    expect(component.pendingCount()).toBe(0);
    component.saveAll().subscribe();
    http.expectNone(URL);
  });

  it('una línea persistida editada viaja como PATCH y queda guardada', () => {
    const fila = persistida(1);
    montar(10, [fila]);
    // Así llega una edición humana: el control se ensucia y cambia de valor.
    fila.controls.cantidad.markAsDirty();
    fila.controls.cantidad.setValue(3);
    expect(component.pendingCount()).toBe(1);

    component.saveAll().subscribe();
    const req = http.expectOne({ method: 'PATCH', url: `${URL}1/` });
    expect(req.request.body.cantidad).toBe(3);
    req.flush(leida(1));

    expect(component.pendingCount()).toBe(0);
  });

  it('extraer IVA sobre una línea persistida la deja pendiente (el setValue no ensucia)', () => {
    const fila = persistida(1);
    montar(10, [fila]);
    component['extraerIvaGroup'] = fila;
    component['extraerIvaValor'].set(150);

    component['applyExtraerIva']({ hide: jest.fn() } as unknown as Popover);

    expect(fila.controls.precio.value).toBe(150);
    expect(component.pendingCount()).toBe(1);
    component.saveAll().subscribe();
    http.expectOne({ method: 'PATCH', url: `${URL}1/` }).flush(leida(1));
  });

  it('un 404 al borrar cuenta como hecho: la línea ya no existe', () => {
    const fila = persistida(3);
    montar(10, [fila]);
    quitar(fila);
    let completo = false;

    component.saveAll().subscribe({ complete: () => (completo = true) });
    http
      .expectOne({ method: 'DELETE', url: `${URL}3/` })
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(completo).toBe(true);
    expect(component.pendingCount()).toBe(0);
  });

  it('reemplazar líneas en edición deja todo pendiente y lo escribe al guardar', () => {
    montar(10, [persistida(1), persistida(2)]);

    component.reemplazarLineas([{ ...nueva().getRawValue(), documento_detalle_afectado: 99 }]);

    http.expectNone(URL);
    // Dos bajas + una alta.
    expect(component.pendingCount()).toBe(3);

    component.saveAll().subscribe();
    http.expectOne({ method: 'DELETE', url: `${URL}1/` }).flush(null);
    http.expectOne({ method: 'DELETE', url: `${URL}2/` }).flush(null);
    const alta = http.expectOne({ method: 'POST', url: URL });
    expect(alta.request.body.documento_detalle_afectado).toBe(99);
    alta.flush(leida(3));
    expect(component.pendingCount()).toBe(0);
  });

  it('en alta quitar una línea es solo local y no deja nada pendiente', () => {
    const fila = nueva();
    montar(null, [fila]);

    quitar(fila);
    component.saveAll().subscribe();

    http.expectNone(URL);
    expect(component.pendingCount()).toBe(0);
  });

  it('con la tabla ocupada rechaza el guardado sin tocar la API', () => {
    montar(10, [nueva()]);
    component['importing'].set(true);
    let error: unknown = null;

    component.saveAll().subscribe({ error: (err: unknown) => (error = err) });

    expect(error).toBeInstanceOf(LineasEnCursoError);
    http.expectNone(URL);
  });

  it('marca ocupada la tabla mientras guarda y la libera aunque falle', () => {
    montar(10, [nueva()]);

    component.saveAll().subscribe({ error: () => undefined });
    expect(component.ocupado()).toBe(true);
    http
      .expectOne({ method: 'POST', url: URL })
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.ocupado()).toBe(false);
  });

  it('un DELETE que falla deja la baja pendiente y el reintento la vuelve a mandar', () => {
    const fila = persistida(4);
    montar(10, [fila]);
    quitar(fila);

    component.saveAll().subscribe({ error: () => undefined });
    http
      .expectOne({ method: 'DELETE', url: `${URL}4/` })
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(component.pendingCount()).toBe(1);

    component.saveAll().subscribe();
    http.expectOne({ method: 'DELETE', url: `${URL}4/` }).flush(null);
    expect(component.pendingCount()).toBe(0);
  });

  it('las bajas van antes que las altas', () => {
    const vieja = persistida(1);
    montar(10, [vieja, nueva()]);
    quitar(vieja);

    component.saveAll().subscribe();
    const baja = http.expectOne({ method: 'DELETE', url: `${URL}1/` });
    expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
    baja.flush(null);

    http.expectOne({ method: 'POST', url: URL }).flush(leida(2));
  });

  it('no manda más de 4 líneas a la vez', () => {
    montar(
      10,
      [1, 2, 3, 4, 5, 6].map((n) => nueva(n)),
    );

    component.saveAll().subscribe();
    const primeras = http.match({ method: 'POST', url: URL });
    expect(primeras).toHaveLength(4);
    primeras[0].flush(leida(1));
    const quinta = http.match({ method: 'POST', url: URL });
    expect(quinta).toHaveLength(1);

    [...primeras.slice(1), ...quinta].forEach((req, i) => req.flush(leida(i + 2)));
    http.match({ method: 'POST', url: URL }).forEach((req) => req.flush(leida(9)));
    expect(component.pendingCount()).toBe(0);
  });

  it('una línea incompleta cuenta como inválida y el guardado la salta', () => {
    const incompleta = createComercialDetalleGroup({ item: ITEM, cantidad: 1, precio: null });
    montar(10, [incompleta]);

    expect(component.hasInvalidPending()).toBe(true);
    component.saveAll().subscribe();
    http.expectNone(URL);
  });

  it('reemplazar dos veces no repite bajas', () => {
    montar(10, [persistida(1)]);

    component.reemplazarLineas([nueva().getRawValue()]);
    component.reemplazarLineas([nueva().getRawValue()]);

    // Una baja (la línea 1) y una alta; la alta del primer reemplazo nunca existió.
    expect(component.pendingCount()).toBe(2);
    component.saveAll().subscribe();
    http.expectOne({ method: 'DELETE', url: `${URL}1/` }).flush(null);
    http.expectOne({ method: 'POST', url: URL }).flush(leida(2));
  });

  it('una alta que falla queda como estaba: sin id y con su valor', () => {
    const fila = nueva(300);
    montar(10, [fila]);

    component.saveAll().subscribe({ error: () => undefined });
    http
      .expectOne({ method: 'POST', url: URL })
      .flush(null, { status: 400, statusText: 'Bad Request' });

    expect(component.detalles().at(0)).toBe(fila);
    expect(fila.controls.id.value).toBeNull();
    expect(fila.controls.precio.value).toBe(300);
  });

  it('si la fila cambia mientras viaja, no se pisa: toma el id y sigue pendiente', () => {
    const fila = nueva(100);
    montar(10, [fila]);

    component.saveAll().subscribe();
    const req = http.expectOne({ method: 'POST', url: URL });
    fila.controls.precio.markAsDirty();
    fila.controls.precio.setValue(250);
    req.flush(leida(7));

    expect(component.detalles().at(0)).toBe(fila);
    expect(fila.controls.id.value).toBe(7);
    expect(fila.controls.precio.value).toBe(250);
    expect(component.pendingCount()).toBe(1);

    // El siguiente guardado actualiza la línea creada, no crea otra.
    component.saveAll().subscribe();
    http.expectOne({ method: 'PATCH', url: `${URL}7/` }).flush(leida(7));
  });

  describe('paginada', () => {
    const LISTA = `${URL}lista/`;
    /** El backend tiene 30 líneas de 100 guardadas: dos páginas (25 + 5). */
    const BASE = { subtotal: 3000, descuento: 0, impuestos: [], total: 3000 };

    function leidaDe(id: number, extra: Record<string, unknown> = {}): ComercialDetalleRead {
      return { ...leida(id), documento: 10, tipo_registro: 'I', ...extra } as ComercialDetalleRead;
    }
    const pagina = (desde: number, hasta: number): ComercialDetalleRead[] =>
      Array.from({ length: hasta - desde + 1 }, (_, i) => leidaDe(desde + i));

    function responderPagina(page: number, results: ComercialDetalleRead[], count = 30): void {
      http
        .expectOne((r) => r.url === LISTA && r.params.get('page') === String(page))
        .flush({ count, next: null, previous: null, results });
    }

    function montarPaginada(): void {
      fixture = TestBed.createComponent(ComercialDocumentoDetallesComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('detalles', new FormArray<ComercialDetalleGroup>([]));
      fixture.componentRef.setInput('documentId', 10);
      fixture.componentRef.setInput('paginada', true);
      fixture.componentRef.setInput('resumenBase', BASE);
      fixture.detectChanges();
    }

    function irA(page: number): void {
      component['onPageChange']({ page });
    }

    const filas = (): ComercialDetalleGroup[] => component.detalles().controls;

    it('al abrir pide una sola página, ordenada y solo con ítems del documento', () => {
      montarPaginada();
      const req = http.expectOne((r) => r.url === LISTA);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.body).toEqual({
        filtros: [
          { propiedad: 'documento_id', operador: '=', valor: 10 },
          { propiedad: 'tipo_registro', operador: '!=', valor: 'C' },
        ],
        ordenamientos: ['id'],
      });
      req.flush({ count: 30, next: null, previous: null, results: pagina(1, 25) });

      expect(filas().length).toBe(25);
      expect(component.resumen().total).toBe(3000);
      expect(component.pendingCount()).toBe(0);
    });

    it('descarta lo que el backend devuelva de otro documento o de cuentas', () => {
      montarPaginada();
      responderPagina(1, [
        leidaDe(1),
        leidaDe(2, { documento: 99 }),
        leidaDe(3, { tipo_registro: 'C' }),
      ]);

      expect(filas().map((f) => f.controls.id.value)).toEqual([1]);
    });

    it('una edición sobrevive al cambio de página y sigue en el total', () => {
      montarPaginada();
      responderPagina(1, pagina(1, 25));
      const editada = filas()[0];
      editada.controls.cantidad.markAsDirty();
      editada.controls.cantidad.setValue(3);
      expect(component.resumen().total).toBe(3200);

      irA(1);
      responderPagina(2, pagina(26, 30));
      expect(filas().length).toBe(5);
      expect(component.pendingCount()).toBe(1);
      expect(component.resumen().total).toBe(3200);

      irA(0);
      responderPagina(1, pagina(1, 25));
      expect(filas()[0]).toBe(editada);
      expect(filas()[0].controls.cantidad.value).toBe(3);
    });

    it('guardar desde otra página manda solo el PATCH de la editada', () => {
      montarPaginada();
      responderPagina(1, pagina(1, 25));
      filas()[0].controls.cantidad.markAsDirty();
      filas()[0].controls.cantidad.setValue(3);
      irA(1);
      responderPagina(2, pagina(26, 30));

      component.saveAll().subscribe();
      const req = http.expectOne({ method: 'PATCH', url: `${URL}1/` });
      req.flush(leidaDe(1, { cantidad: 3 }));

      expect(component.pendingCount()).toBe(0);
      expect(component.resumen().total).toBe(3200);
    });

    it('quitar en la página 2 resta del total y al guardar hace un solo DELETE', () => {
      montarPaginada();
      responderPagina(1, pagina(1, 25));
      irA(1);
      responderPagina(2, pagina(26, 30));
      quitar(filas()[0]);
      expect(component.resumen().total).toBe(2900);

      irA(0);
      responderPagina(1, pagina(1, 25));
      irA(1);
      // La quitada no vuelve aunque el backend la siga listando.
      responderPagina(2, pagina(26, 30));
      expect(filas().map((f) => f.controls.id.value)).toEqual([27, 28, 29, 30]);

      component.saveAll().subscribe();
      http.expectOne({ method: 'DELETE', url: `${URL}26/` }).flush(null);
      expect(component.resumen().total).toBe(2900);
    });

    it('las líneas nuevas se ven en todas las páginas', () => {
      montarPaginada();
      responderPagina(1, pagina(1, 25));
      component.detalles().push(nueva(250));
      expect(component.resumen().total).toBe(3250);

      irA(1);
      responderPagina(2, pagina(26, 30));
      expect(filas().length).toBe(6);
      expect(filas()[5].controls.id.value).toBeNull();
    });

    it('un guardado a medias no desfasa el total', () => {
      montarPaginada();
      responderPagina(1, pagina(1, 25));
      const [a, b] = filas();
      for (const fila of [a, b]) {
        fila.controls.cantidad.markAsDirty();
        fila.controls.cantidad.setValue(2);
      }
      expect(component.resumen().total).toBe(3200);

      component.saveAll().subscribe({ error: () => undefined });
      http.expectOne({ method: 'PATCH', url: `${URL}1/` }).flush(leidaDe(1, { cantidad: 2 }));
      http
        .expectOne({ method: 'PATCH', url: `${URL}2/` })
        .flush(null, { status: 500, statusText: 'Error' });

      expect(component.pendingCount()).toBe(1);
      expect(component.resumen().total).toBe(3200);
      // La guardada sale de la vista y vuelve leída del backend: el total no cambia.
      irA(1);
      responderPagina(2, pagina(26, 30));
      irA(0);
      responderPagina(1, [leidaDe(1, { cantidad: 2 }), ...pagina(2, 25)]);
      expect(component.resumen().total).toBe(3200);
    });

    it('reemplazar las líneas lee todas las páginas para darlas de baja', () => {
      montarPaginada();
      responderPagina(1, pagina(1, 25));

      component.reemplazarLineas(
        [comercialDetalleToFormValue(leida(0))].map((v) => ({ ...v, id: null })),
      );
      expect(component.ocupado()).toBe(true);
      http
        .expectOne((r) => r.url === LISTA && r.params.get('page') === '1')
        .flush({ count: 30, next: 'page=2', previous: null, results: pagina(1, 25) });
      http
        .expectOne((r) => r.url === LISTA && r.params.get('page') === '2')
        .flush({ count: 30, next: null, previous: null, results: pagina(26, 30) });

      expect(component.ocupado()).toBe(false);
      expect(filas().length).toBe(1);
      expect(component.pendingCount()).toBe(31);
      expect(component.resumen().total).toBe(100);
    });
  });

  describe('quitar varias líneas', () => {
    /** Marca las filas y las quita como lo hace el botón de la barra tras confirmar. */
    function quitarVarias(filas: ComercialDetalleGroup[]): void {
      for (const fila of filas) component['toggleSeleccion'](fila);
      component['deleteLineas'](component['seleccionadas']());
    }

    it('en edición deja las persistidas para el guardado y no llama a la API', () => {
      const [a, b, c] = [persistida(1), persistida(2), persistida(3)];
      montar(10, [a, b, c]);

      quitarVarias([a, c]);

      http.expectNone(URL);
      expect(component.detalles().controls).toEqual([b]);
      expect(component.pendingCount()).toBe(2);
      expect(component['seleccionadas']()).toEqual([]);

      component.saveAll().subscribe();
      http.expectOne({ method: 'DELETE', url: `${URL}1/` }).flush(null);
      http.expectOne({ method: 'DELETE', url: `${URL}3/` }).flush(null);
      expect(component.pendingCount()).toBe(0);
    });

    it('una línea nueva marcada solo sale de la tabla: no tiene nada que borrar', () => {
      const guardada = persistida(1);
      montar(10, [guardada, nueva()]);

      quitarVarias([...component.detalles().controls]);

      expect(component.detalles().length).toBe(0);
      // Solo la persistida queda como baja pendiente.
      expect(component.pendingCount()).toBe(1);
    });

    it('en alta quitar varias es solo local', () => {
      montar(null, [nueva(), nueva()]);

      quitarVarias([...component.detalles().controls]);
      component.saveAll().subscribe();

      http.expectNone(URL);
      expect(component.detalles().length).toBe(0);
      expect(component.pendingCount()).toBe(0);
    });

    it('marcar todas llena la cabecera; marcar algunas la deja a medias', () => {
      const [a, b] = [persistida(1), persistida(2)];
      montar(10, [a, b]);

      component['toggleSeleccion'](a);
      expect(component['seleccionParcial']()).toBe(true);
      expect(component['todasSeleccionadas']()).toBe(false);

      component['toggleTodas']();
      expect(component['todasSeleccionadas']()).toBe(true);
      expect(component['seleccionParcial']()).toBe(false);

      component['toggleTodas']();
      expect(component['seleccionadas']()).toEqual([]);
    });

    it('reemplazar las líneas vacía la selección', () => {
      const fila = persistida(1);
      montar(10, [fila]);
      component['toggleSeleccion'](fila);

      component.reemplazarLineas([nueva().getRawValue()]);

      expect(component['seleccionadas']()).toEqual([]);
    });

    it('una fila que el guardado reconstruye deja de contar como marcada', () => {
      const fila = nueva();
      montar(10, [fila]);
      component['toggleSeleccion'](fila);

      component.saveAll().subscribe();
      http.expectOne({ method: 'POST', url: URL }).flush(leida(7));

      expect(component.detalles().at(0)).not.toBe(fila);
      expect(component['seleccionadas']()).toEqual([]);
    });
  });
});

/**
 * Con la plantilla **real**: la tabla es `OnPush`, así que lo que no pase por un
 * signal no se pinta. Estos casos cubren los cambios que llegan de afuera o sin
 * mover el valor, que son los que una plantilla `OnPush` pierde primero.
 */
describe('ComercialDocumentoDetallesComponent — refresco con OnPush', () => {
  let fixture: ComponentFixture<ComercialDocumentoDetallesComponent>;
  let array: FormArray<ComercialDetalleGroup>;

  function montar(documentId: number | null, filas: ComercialDetalleGroup[]): void {
    array = new FormArray<ComercialDetalleGroup>(filas);
    fixture = TestBed.createComponent(ComercialDocumentoDetallesComponent);
    fixture.componentRef.setInput('detalles', array);
    fixture.componentRef.setInput('documentId', documentId);
    fixture.detectChanges();
  }

  const filasPintadas = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tr.comercial-detalle-table__row'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ComercialDocumentoDetallesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
        { provide: ToastService, useValue: { success: jest.fn(), warn: jest.fn() } },
        {
          provide: ErpSelectDataService,
          useValue: { fetchOptions: () => of([]), fetchAllOptions: () => of([]) },
        },
        { provide: DialogService, useValue: {} },
      ],
    });
  });

  it('en alta pinta la primera línea agregada a una tabla vacía', () => {
    montar(null, []);
    expect(filasPintadas()).toHaveLength(0);

    fixture.componentInstance['addLinea']();
    fixture.detectChanges();

    expect(filasPintadas()).toHaveLength(1);
  });

  it('pinta las líneas que el padre empuja al cargar el documento', () => {
    montar(10, []);

    array.push(persistida(1));
    array.push(persistida(2));
    fixture.detectChanges();

    expect(filasPintadas()).toHaveLength(2);
  });

  it('recalcula el subtotal de la fila al cambiar la cantidad', () => {
    montar(10, [persistida(1)]);

    array.at(0).controls.cantidad.setValue(3);
    fixture.detectChanges();

    expect(filasPintadas()[0].textContent).toContain('300');
  });

  it('guardar en blanco desde el padre marca la fila incompleta', () => {
    montar(10, [createComercialDetalleGroup()]);
    const autocomplete = (): ErpItemAutocompleteComponent =>
      fixture.debugElement.query(By.directive(ErpItemAutocompleteComponent)).componentInstance;
    expect(autocomplete().invalid()).toBe(false);

    // Lo que hace `libFocusInvalid` sobre el form padre: no mueve ningún valor.
    array.markAllAsTouched();
    fixture.detectChanges();

    expect(autocomplete().invalid()).toBe(true);
  });

  it('una fila guardada que se ensucia sin cambiar su valor se muestra pendiente', () => {
    montar(10, [persistida(1)]);
    expect(filasPintadas()[0].classList).not.toContain('comercial-detalle-table__row--pending');

    // Así queda una fila que cambió mientras viajaba su guardado (`persistirFila`).
    array.at(0).markAsDirty();
    fixture.detectChanges();

    expect(filasPintadas()[0].classList).toContain('comercial-detalle-table__row--pending');
    expect(fixture.componentInstance.pendingCount()).toBe(1);
  });
});

describe('ComercialDocumentoDetallesComponent — cableado de filas', () => {
  let fixture: ComponentFixture<ComercialDocumentoDetallesComponent>;
  let component: ComercialDocumentoDetallesComponent;
  let array: FormArray<ComercialDetalleGroup>;
  let http: HttpTestingController;

  const ITEM_B = { id: 6, nombre: 'Tuerca', precio: 50 };

  /** Lectura completa del ítem con un solo impuesto de venta. */
  function itemLeido(id: number, impuesto: number): unknown {
    return {
      id,
      nombre: `Ítem ${id}`,
      costo: '0',
      impuestos: [{ impuesto, impuesto_venta: true, impuesto_compra: false }],
    };
  }

  function montar(documentId: number | null, filas: ComercialDetalleGroup[]): void {
    array = new FormArray<ComercialDetalleGroup>(filas);
    fixture = TestBed.createComponent(ComercialDocumentoDetallesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('detalles', array);
    fixture.componentRef.setInput('documentId', documentId);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ComercialDocumentoDetallesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
        { provide: ToastService, useValue: { success: jest.fn(), warn: jest.fn() } },
        { provide: ErpSelectDataService, useValue: { fetchOptions: () => of([]) } },
        { provide: DialogService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(ComercialDocumentoDetallesComponent, {
      set: { template: '', imports: [] },
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cambiar de ítem antes de que responda el anterior no deja sus impuestos', () => {
    montar(null, [createComercialDetalleGroup()]);
    const fila = array.at(0);

    fila.controls.item.setValue(ITEM);
    fila.controls.item.setValue(ITEM_B);
    const delA = http.expectOne('/api/general/item/5/');
    const delB = http.expectOne('/api/general/item/6/');

    // El del ítem actual responde primero; el del anterior, tarde.
    delB.flush(itemLeido(6, 3));
    delA.flush(itemLeido(5, 9));

    expect(fila.controls.impuestos_ids.value).toEqual([3]);
  });

  it('una fila quitada deja de consultar impuestos al cambiarle el ítem', () => {
    montar(10, [persistida(1)]);
    const fila = array.at(0);

    component['lineas'].quitar(fila);
    fila.controls.item.setValue(ITEM_B);

    http.expectNone((req) => req.url.includes('/general/item/'));
  });

  it('agregar muchas líneas sincroniza la tabla una sola vez', () => {
    montar(null, []);
    const sync = jest.spyOn(component['lines'], 'set');
    const valores = Array.from({ length: 50 }, () => ({
      ...comercialDetalleToFormValue(leida(1)),
      id: null,
    }));

    component['agregarLineas'](valores, { title: '', desc: '' });

    expect(array.length).toBe(50);
    expect(sync).toHaveBeenCalledTimes(1);
  });
});
