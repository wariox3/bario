import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { DialogService } from 'primeng/dynamicdialog';
import { ENVIRONMENT, I18nService, ToastService } from '@reddoc/core';
import type { DocumentoPendienteApi } from '@erp/core/module-config';
import { dictionaries } from '@erp/i18n';
import {
  createCuentaDetalleGroup,
  type CuentaDetalleGroup,
} from '../../contable-documento-detalle.form';
import type { CuentaDetalleRead } from '../../contable-documento-detalle.model';
import { LineasEnCursoError } from '../../../lineas-diferidas';
import { ContableDocumentoDetallesComponent } from './contable-documento-detalles.component';

const URL = '/api/general/documento-detalle/';
const CUENTA = { id: 7, nombre: '1105 - Caja' };

/** Línea ya persistida (con `id`), como llega al abrir un documento en edición. */
function persistida(id: number): CuentaDetalleGroup {
  return createCuentaDetalleGroup({ id, cuenta: CUENTA, naturaleza: 'D', valor: 100 });
}

/** Línea nueva con cuenta: pendiente hasta que se guarde. */
function nueva(valor = 100): CuentaDetalleGroup {
  return createCuentaDetalleGroup({ cuenta: CUENTA, naturaleza: 'D', valor });
}

/** Respuesta mínima del backend para una línea guardada. */
function leida(id: number): CuentaDetalleRead {
  return {
    id,
    cuenta: 7,
    cuenta_codigo: '1105',
    cuenta_nombre: 'Caja',
    naturaleza: 'D',
    precio: '100.00',
  } as unknown as CuentaDetalleRead;
}

/** Documento con saldo, como lo devuelve el modal de "agregar documento". */
function pendiente(id: number): DocumentoPendienteApi {
  return {
    id,
    numero: 30,
    pendiente: '250.00',
    contacto: 3,
    contacto_nombre_corto: 'Proveedor',
    documento_tipo_cuenta_pagar_id: 9,
    documento_tipo_cuenta_pagar_codigo: '2205',
    documento_tipo_cuenta_pagar_nombre: 'Proveedores',
    documento_tipo_operacion: 1,
  } as unknown as DocumentoPendienteApi;
}

describe('ContableDocumentoDetallesComponent — guardado diferido', () => {
  let fixture: ComponentFixture<ContableDocumentoDetallesComponent>;
  let component: ContableDocumentoDetallesComponent;
  let http: HttpTestingController;

  /** Monta la tabla sin template: se prueba la lógica de guardado, no PrimeNG. */
  function montar(documentId: number | null, filas: CuentaDetalleGroup[]): void {
    fixture = TestBed.createComponent(ContableDocumentoDetallesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('detalles', new FormArray<CuentaDetalleGroup>(filas));
    fixture.componentRef.setInput('documentId', documentId);
    fixture.componentRef.setInput('carteraTipo', 'pagar');
    fixture.detectChanges();
  }

  /** Quita una fila como lo hace la papelera tras confirmar. */
  function quitar(fila: CuentaDetalleGroup): void {
    component['lineas'].quitar(fila);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ContableDocumentoDetallesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
        {
          provide: ToastService,
          useValue: { success: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        { provide: DialogService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(ContableDocumentoDetallesComponent, {
      set: { template: '', imports: [] },
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pendingCount responde 0 antes de recibir sus inputs (el padre lo lee desde arriba)', () => {
    fixture = TestBed.createComponent(ContableDocumentoDetallesComponent);
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

  it('una línea nueva viaja como POST al guardar y queda con su id', () => {
    montar(10, [nueva()]);
    expect(component.pendingCount()).toBe(1);

    component.saveAll().subscribe();
    const alta = http.expectOne({ method: 'POST', url: URL });
    expect(alta.request.body).toEqual(
      expect.objectContaining({ documento: 10, cuenta: 7, tipo_registro: 'C' }),
    );
    alta.flush(leida(4));

    expect(component.detalles().at(0).controls.id.value).toBe(4);
    expect(component.pendingCount()).toBe(0);
  });

  it('una línea persistida editada viaja como PATCH; sin tocar no viaja', () => {
    const [tocada, quieta] = [persistida(1), persistida(2)];
    montar(10, [tocada, quieta]);
    tocada.controls.valor.setValue(300);
    tocada.markAsDirty();

    component.saveAll().subscribe();
    const req = http.expectOne({ method: 'PATCH', url: `${URL}1/` });
    expect(req.request.body.precio).toBe('300.00');
    req.flush(leida(1));
    http.expectNone(`${URL}2/`);

    expect(component.pendingCount()).toBe(0);
  });

  it('agregar documentos en edición los deja pendientes sin llamar a la API', () => {
    montar(10, [persistida(1)]);

    component['resolveAndAddDocumentos']([pendiente(30), pendiente(31)]);

    http.expectNone(`${URL}masivo/`);
    http.expectNone(URL);
    expect(component.detalles().length).toBe(3);
    expect(component.pendingCount()).toBe(2);

    component.saveAll().subscribe();
    const altas = http.match({ method: 'POST', url: URL });
    expect(altas.map((r) => r.request.body.documento_afectado)).toEqual([30, 31]);
    altas.forEach((r, i) => r.flush(leida(20 + i)));
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

  it('una fila recién agregada sin cuenta no cuenta como pendiente', () => {
    montar(10, [createCuentaDetalleGroup()]);
    expect(component.pendingCount()).toBe(0);
  });

  it('si una línea falla, las demás terminan y reintentar no duplica las guardadas', () => {
    const [a, b] = [nueva(100), nueva(200)];
    montar(10, [a, b]);
    let error: unknown;

    component.saveAll().subscribe({ error: (e: unknown) => (error = e) });
    const [ok, falla] = http.match({ method: 'POST', url: URL });
    ok.flush(leida(1));
    falla.flush(null, { status: 400, statusText: 'Bad Request' });

    expect(error).toBeDefined();
    expect(component.pendingCount()).toBe(1);

    component.saveAll().subscribe();
    const reintento = http.expectOne({ method: 'POST', url: URL });
    expect(reintento.request.body.precio).toBe('200.00');
    reintento.flush(leida(2));
    expect(component.pendingCount()).toBe(0);
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

  it('marca ocupada la tabla mientras guarda y rechaza un segundo guardado', () => {
    montar(10, [nueva()]);

    component.saveAll().subscribe();
    expect(component.ocupado()).toBe(true);

    let error: unknown;
    component.saveAll().subscribe({ error: (e: unknown) => (error = e) });
    expect(error).toBeInstanceOf(LineasEnCursoError);

    http.expectOne({ method: 'POST', url: URL }).flush(leida(1));
    expect(component.ocupado()).toBe(false);
  });

  it('si la fila cambia mientras viaja, no se pisa: toma el id y sigue pendiente', () => {
    const fila = nueva(100);
    montar(10, [fila]);

    component.saveAll().subscribe();
    const req = http.expectOne({ method: 'POST', url: URL });
    fila.controls.valor.setValue(150);
    req.flush(leida(5));

    expect(component.detalles().at(0)).toBe(fila);
    expect(fila.controls.id.value).toBe(5);
    expect(fila.controls.valor.value).toBe(150);
    expect(component.pendingCount()).toBe(1);
  });
});
