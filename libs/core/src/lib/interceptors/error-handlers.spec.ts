import { HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import type { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { handleForbidden, handleUnauthorized } from './error-handlers';
import type { ForbiddenPageStore } from '../errors/forbidden-page.store';
import { TokenRefreshService } from '../services/token-refresh.service';
import type { ToastService } from '../services/toast.service';
import type { TenantService } from '../tenant/tenant.service';
import type { AuthServiceContract, RoutePaths } from '../tokens';

const forbidden = (detail = 'No tienes acceso a este recurso.') =>
  new HttpErrorResponse({ status: 403, statusText: 'Forbidden', error: { detail } });

function setup() {
  const toast = { error: jest.fn(), warn: jest.fn() } as unknown as ToastService;
  const blocked: string[] = [];
  const forbiddenPage = {
    block: (message: string) => blocked.push(message),
  } as unknown as ForbiddenPageStore;
  const router = { url: '/t/acme/venta/contactos', navigateByUrl: jest.fn() } as unknown as Router;
  const tenant = { clear: jest.fn() } as unknown as TenantService;
  const routes = { dashboard: { root: '/contenedores' } } as RoutePaths;

  const run = (req: HttpRequest<unknown>, error = forbidden()) =>
    handleForbidden(req, toast, router, tenant, routes, forbiddenPage, error);

  return { run, toast, blocked };
}

describe('handleForbidden', () => {
  it('bloquea la pantalla cuando niegan el listado, sin toast', (done) => {
    const { run, toast, blocked } = setup();
    const req = new HttpRequest('POST', '/api/general/contacto/lista/?page=1', {});

    run(req).subscribe({
      complete: () => {
        expect(blocked).toEqual(['No tienes acceso a este recurso.']);
        expect(toast.error).not.toHaveBeenCalled();
        done();
      },
      error: () => done.fail('el error no debe propagarse: lo muestra la pantalla'),
    });
  });

  it('deja pasar el error con toast cuando niegan una escritura', (done) => {
    const { run, toast, blocked } = setup();
    const req = new HttpRequest('POST', '/api/general/contacto/', { nombre: 'x' });

    run(req).subscribe({
      error: () => {
        expect(blocked).toEqual([]);
        expect(toast.error).toHaveBeenCalledWith(
          'Acceso denegado',
          'No tienes acceso a este recurso.',
        );
        done();
      },
      complete: () => done.fail('la escritura sí debe propagar el error'),
    });
  });

  it('no bloquea por un GET: los selects de un formulario también son GET', (done) => {
    const { run, blocked } = setup();
    const req = new HttpRequest('GET', '/api/general/contacto/lista/');

    run(req).subscribe({
      error: () => {
        expect(blocked).toEqual([]);
        done();
      },
    });
  });

  it('no confunde un endpoint que contiene "lista" con el listado', (done) => {
    const { run, blocked } = setup();
    const req = new HttpRequest('POST', '/api/contenedor/cliente/lista-usuario/', {});

    run(req).subscribe({
      error: () => {
        expect(blocked).toEqual([]);
        done();
      },
    });
  });
});

describe('handleUnauthorized', () => {
  const unauthorized = new HttpErrorResponse({
    status: 401,
    error: { detail: 'Las credenciales de autenticación no se proveyeron.' },
  });
  const req = new HttpRequest('DELETE', '/api/humano/programacion/5/');

  function setup(refresh: AuthServiceContract['refresh']) {
    const authService = { refresh, clearSession: jest.fn() } as unknown as AuthServiceContract;
    const tokenRefresh = new TokenRefreshService();
    const run = (next: HttpHandlerFn) =>
      handleUnauthorized(req, next, authService, tokenRefresh, unauthorized, []);
    return { run, authService, tokenRefresh };
  }

  it('reintenta la petición tras renovar el token', (done) => {
    const { run, authService, tokenRefresh } = setup(() => of(undefined));
    const next = jest.fn(() => of(new HttpResponse({ status: 204 })));

    run(next).subscribe({
      complete: () => {
        expect(next).toHaveBeenCalledWith(req);
        expect(authService.clearSession).not.toHaveBeenCalled();
        expect(tokenRefresh.refreshing).toBe(false);
        done();
      },
    });
  });

  it('no cierra la sesión si el reintento falla con un error de negocio', (done) => {
    const { run, authService } = setup(() => of(undefined));
    const negocio = new HttpErrorResponse({
      status: 400,
      error: { detail: 'No se puede eliminar una programación con contratos cargados.' },
    });

    run(() => throwError(() => negocio)).subscribe({
      error: (err) => {
        expect(err).toBe(negocio);
        expect(authService.clearSession).not.toHaveBeenCalled();
        done();
      },
      complete: () => done.fail('el error del reintento debe propagarse'),
    });
  });

  it('cierra la sesión si el refresh falla, sin reintentar', (done) => {
    const refreshError = new HttpErrorResponse({ status: 401 });
    const { run, authService, tokenRefresh } = setup(() => throwError(() => refreshError));
    const next = jest.fn();

    run(next).subscribe({
      error: (err) => {
        expect(err).toBe(refreshError);
        expect(next).not.toHaveBeenCalled();
        expect(authService.clearSession).toHaveBeenCalled();
        expect(tokenRefresh.refreshing).toBe(false);
        done();
      },
    });
  });
});
