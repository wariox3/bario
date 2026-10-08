import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as Sentry from '@sentry/angular';
import { observabilidadInterceptor } from './observabilidad.interceptor';
import { RespuestaServidorError } from './observabilidad.errors';

jest.mock('@sentry/angular', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;

describe('observabilidadInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    captureException.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([observabilidadInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function responder(url: string, status: number, body: unknown = null): void {
    http.get(url).subscribe({ error: () => undefined });
    backend.expectOne(url).flush(body, { status, statusText: 'x' });
  }

  it('reporta un 5xx agrupado por endpoint, con el request_id del backend', () => {
    // Sobre de error del backend (`ApiErrorResponse`): el único que trae request_id.
    responder('/api/documento/123/?page=2', 500, {
      success: false,
      error: { code: 'server_error', message: 'boom' },
      request_id: 'req-abc',
    });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, contexto] = captureException.mock.calls[0];
    expect(error).toBeInstanceOf(RespuestaServidorError);
    expect(error.message).toBe('GET /api/documento/:id/ respondió 500');
    expect(contexto.fingerprint).toEqual([
      'respuesta-servidor',
      'GET',
      '/api/documento/:id/',
      '500',
    ]);
    expect(contexto.tags.request_id).toBe('req-abc');
  });

  it('dos documentos distintos caen en el mismo issue', () => {
    responder('/api/documento/1/', 502);
    responder('/api/documento/2/', 502);

    const [, primero] = captureException.mock.calls[0];
    const [, segundo] = captureException.mock.calls[1];
    expect(primero.fingerprint).toEqual(segundo.fingerprint);
  });

  it('normaliza también los uuid', () => {
    responder('/api/archivo/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90/', 500);

    expect(captureException.mock.calls[0][0].message).toBe('GET /api/archivo/:id/ respondió 500');
  });

  it.each([400, 401, 403, 404, 409, 429])('no reporta un %s', (status) => {
    responder('/api/documento/1/', status);

    expect(captureException).not.toHaveBeenCalled();
  });

  it('no reporta una caída de red (status 0)', () => {
    http.get('/api/documento/1/').subscribe({ error: () => undefined });
    backend.expectOne('/api/documento/1/').error(new ProgressEvent('error'));

    expect(captureException).not.toHaveBeenCalled();
  });

  it('reenvía el error a quien hizo la petición', () => {
    const recibido = jest.fn();
    http.get('/api/x/').subscribe({ error: recibido });
    backend.expectOne('/api/x/').flush(null, { status: 500, statusText: 'x' });

    expect(recibido).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });
});
