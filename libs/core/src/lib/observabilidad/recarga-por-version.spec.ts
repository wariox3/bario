import { TestBed } from '@angular/core/testing';
import { NavigationError, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { Subject } from 'rxjs';
import { ChunkNoCargaError } from './observabilidad.errors';
import { recargarAnteVersionNueva } from './recarga-por-version';

jest.mock('@sentry/angular', () => ({ captureException: jest.fn() }));

const captureException = Sentry.captureException as jest.Mock;
const CHUNK_VIEJO = new TypeError(
  'Failed to fetch dynamically imported module: https://erp.reddoc2.co/chunk-ABC.js',
);

describe('recargarAnteVersionNueva', () => {
  let eventos: Subject<unknown>;
  let assign: jest.Mock;

  beforeEach(() => {
    captureException.mockClear();
    sessionStorage.clear();
    eventos = new Subject();
    assign = jest.fn();
    Object.defineProperty(window, 'location', { value: { assign }, writable: true });

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { events: eventos } }],
    });
    TestBed.runInInjectionContext(() => recargarAnteVersionNueva());
  });

  function fallaNavegacion(error: unknown, url = '/t/acme/venta/factura'): void {
    eventos.next(new NavigationError(1, url, error));
  }

  it('recarga en la URL de destino cuando un chunk no carga', () => {
    fallaNavegacion(CHUNK_VIEJO);

    expect(assign).toHaveBeenCalledWith('/t/acme/venta/factura');
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reconoce el mensaje de Safari y el de Firefox', () => {
    fallaNavegacion(new TypeError('Importing a module script failed.'));
    sessionStorage.clear();
    fallaNavegacion(new TypeError('error loading dynamically imported module'));

    expect(assign).toHaveBeenCalledTimes(2);
  });

  it('si ya recargó hace poco, no recarga otra vez: reporta', () => {
    fallaNavegacion(CHUNK_VIEJO);
    fallaNavegacion(CHUNK_VIEJO);

    expect(assign).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.any(ChunkNoCargaError),
      expect.objectContaining({ extra: { mensajeOriginal: CHUNK_VIEJO.message } }),
    );
  });

  it('sin sessionStorage no recarga (evita el bucle): reporta', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado');
    });

    fallaNavegacion(CHUNK_VIEJO);

    expect(assign).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(expect.any(ChunkNoCargaError), expect.anything());
    jest.restoreAllMocks();
  });

  it('ignora los errores de navegación que no son de chunks', () => {
    fallaNavegacion(new Error('Guard rechazó'));

    expect(assign).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });
});
