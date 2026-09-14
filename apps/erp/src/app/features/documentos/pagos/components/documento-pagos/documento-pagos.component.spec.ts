import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { ENVIRONMENT, I18nService, ToastService } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import { PagosEnCursoError } from '../../pago.errors';
import { createPagoGroup, type PagoGroup } from '../../pago.form';
import type { PagoRead } from '../../pago.model';
import { DocumentoPagosComponent } from './documento-pagos.component';

const URL = '/api/general/documento-pago/';
const BANCO = { id: 7, nombre: 'Bancolombia' };

function leido(id: number, monto: number): PagoRead {
  return {
    id,
    documento: 10,
    cuenta_banco: 7,
    cuenta_banco_nombre: 'Bancolombia',
    pago: `${monto}.00`,
    estado_anulado: false,
  };
}

function nueva(monto: number): PagoGroup {
  return createPagoGroup({ cuenta_banco: BANCO, pago: monto });
}

describe('DocumentoPagosComponent', () => {
  const toast = { success: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  let fixture: ComponentFixture<DocumentoPagosComponent>;
  let component: DocumentoPagosComponent;
  let http: HttpTestingController;

  /** Monta la tabla sin template: se prueba la lógica de guardado, no PrimeNG. */
  function montar(documentId: number | null, filas: PagoGroup[], total = 1_000_000): void {
    fixture = TestBed.createComponent(DocumentoPagosComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pagos', new FormArray<PagoGroup>(filas));
    fixture.componentRef.setInput('documentTotal', total);
    fixture.componentRef.setInput('documentId', documentId);
    fixture.detectChanges();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [DocumentoPagosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.overrideComponent(DocumentoPagosComponent, { set: { template: '', imports: [] } });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('guarda en serie y cada pago viaja con el valor que tiene al enviarse', () => {
    const primera = nueva(100);
    const segunda = nueva(200);
    montar(10, [primera, segunda]);
    let completo = false;

    component.saveAll().subscribe({ complete: () => (completo = true) });

    const req1 = http.expectOne(URL);
    expect(req1.request.body).toEqual({ documento: 10, cuenta_banco: 7, pago: '100.00' });
    // La persona corrige el segundo monto mientras se guarda el primero.
    segunda.controls.pago.setValue(250);
    req1.flush(leido(1, 100));

    const req2 = http.expectOne(URL);
    expect(req2.request.body.pago).toBe('250.00');
    req2.flush(leido(2, 250));

    expect(completo).toBe(true);
    expect(component.pendingCount()).toBe(0);
  });

  it('la fila que guarda su ✓ no se reenvía y un lote a la vez se rechaza', () => {
    const fila = nueva(100);
    montar(10, [fila]);

    component['savePago'](fila);
    const enVuelo = http.expectOne(URL);
    expect(component.ocupado()).toBe(true);
    expect(component.pendingCount()).toBe(0);

    let error: unknown;
    component.saveAll().subscribe({ error: (e: unknown) => (error = e) });
    expect(error).toBeInstanceOf(PagosEnCursoError);
    http.expectNone(URL);

    enVuelo.flush(leido(1, 100));
    expect(component.ocupado()).toBe(false);
  });

  it('si falla un pago corta, libera la tabla y deja pendientes los que faltan', () => {
    montar(10, [nueva(100), nueva(200), nueva(300)]);
    let error: unknown;

    component.saveAll().subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne(URL).flush(leido(1, 100));
    http
      .expectOne(URL)
      .flush(
        { detail: 'La cuenta bancaria no tiene cuenta contable' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    http.expectNone(URL);
    expect(component.ocupado()).toBe(false);
    expect(component.pendingCount()).toBe(2);
  });

  it('no persiste pagos anulados ni filas sin cuenta de banco', () => {
    const anulado = createPagoGroup({
      id: 5,
      cuenta_banco: BANCO,
      pago: 100,
      estado_anulado: true,
    });
    const sinCuenta = createPagoGroup({ pago: 200 });
    montar(10, [anulado, sinCuenta, nueva(300)]);

    component.saveAll().subscribe();
    const req = http.expectOne(URL);
    expect(req.request.body.pago).toBe('300.00');
    req.flush(leido(3, 300));
    http.expectNone(URL);
  });

  it('en alta no hay pendientes y los pagos se registran contra el id del documento creado', () => {
    montar(null, [nueva(100)]);
    expect(component.pendingCount()).toBe(0);
    expect(component.rowCount()).toBe(1);

    component.saveAll(99).subscribe();
    const req = http.expectOne(URL);
    expect(req.request.body.documento).toBe(99);
    req.flush(leido(1, 100));
  });

  it('"Guardar pagos" con solo filas incompletas avisa y no anuncia que guardó', () => {
    const incompleta = createPagoGroup({ id: 4, cuenta_banco: BANCO, pago: 100 });
    incompleta.controls.pago.setValue(0);
    incompleta.markAsDirty();
    montar(10, [incompleta]);

    component['onSaveAllClick']();

    expect(toast.warn).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    http.expectNone(URL);
  });

  it('"Agregar pago" con el saldo cubierto avisa en vez de crear una fila en cero', () => {
    montar(10, [createPagoGroup({ id: 1, cuenta_banco: BANCO, pago: 1_000_000 })]);

    component['addPago']();

    expect(toast.warn).toHaveBeenCalledWith(
      dictionaries.es.entities.documentoPago.toasts.sinSaldo.title,
      dictionaries.es.entities.documentoPago.toasts.sinSaldo.desc,
    );
    expect(component.pagos().length).toBe(1);
  });
});
