import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { DialogService } from 'primeng/dynamicdialog';
import type { Popover } from 'primeng/popover';
import { of } from 'rxjs';
import {
  ENVIRONMENT,
  ErpSelectDataService,
  I18nService,
  ToastService,
  type ComercialDetalleRead,
} from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '../../comercial-documento-detalle.form';
import { LineasEnCursoError } from '../../../lineas-diferidas';
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
