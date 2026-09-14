import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { ENVIRONMENT, I18nService, ToastService } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import type { PagoFormRawValue } from '../../pago.form';
import { DocumentoPagosTableComponent } from './documento-pagos-table.component';

const URL_ANULAR = '/api/general/documento-pago/anular/';
const PAGO: PagoFormRawValue = {
  id: 8,
  cuenta_banco: { id: 7, nombre: 'Bancolombia' },
  pago: 100000,
  estado_anulado: false,
};

describe('DocumentoPagosTableComponent · anular', () => {
  const toast = { success: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  let fixture: ComponentFixture<DocumentoPagosTableComponent>;
  let component: DocumentoPagosTableComponent;
  let http: HttpTestingController;
  let emitido: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [DocumentoPagosTableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
        { provide: ToastService, useValue: toast },
      ],
    });
    // La confirmación se acepta sola: se prueba lo que pasa después del "sí".
    TestBed.overrideComponent(DocumentoPagosTableComponent, {
      set: {
        template: '',
        imports: [],
        providers: [
          {
            provide: ConfirmationService,
            useValue: { confirm: (c: Confirmation) => c.accept?.() },
          },
        ],
      },
    });
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(DocumentoPagosTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pagos', [PAGO]);
    fixture.componentRef.setInput('anulable', true);
    fixture.detectChanges();
    emitido = false;
    component.anulado.subscribe(() => (emitido = true));
  });

  afterEach(() => http.verify());

  it('confirma, llama a anular/ con el id, avisa y emite para que la ficha recargue', () => {
    component['onAnular'](PAGO);

    const req = http.expectOne(URL_ANULAR);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id: 8 });
    req.flush({
      ...PAGO,
      documento: 10,
      cuenta_banco: 7,
      cuenta_banco_nombre: 'Bancolombia',
      estado_anulado: true,
    });

    expect(toast.success).toHaveBeenCalled();
    expect(emitido).toBe(true);
    expect(component['anulandoId']()).toBeNull();
  });

  it('si el backend lo rechaza muestra su motivo y no emite', () => {
    component['onAnular'](PAGO);

    http
      .expectOne(URL_ANULAR)
      .flush(
        { detail: 'El documento está contabilizado' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(toast.error).toHaveBeenCalledWith(
      dictionaries.es.entities.documentoPago.toasts.anularError.title,
      'El documento está contabilizado',
    );
    expect(emitido).toBe(false);
    expect(component['anulandoId']()).toBeNull();
  });

  it('un pago sin id no se puede anular', () => {
    component['onAnular']({ ...PAGO, id: null });
    http.expectNone(URL_ANULAR);
  });
});
