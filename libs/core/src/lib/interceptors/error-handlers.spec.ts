import { HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import type { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
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

  function setup(refresh: AuthServiceContract['refresh'], autenticado = true) {
    const authService = {
      refresh: jest.fn(refresh),
      clearSession: jest.fn(),
      isAuthenticated: () => autenticado,
    } as unknown as AuthServiceContract;
    const tokenRefresh = new TokenRefreshService();
    const warns: string[] = [];
    const toast = { warn: (summary: string) => warns.push(summary) } as unknown as ToastService;
    const run = (next: HttpHandlerFn) =>
      handleUnauthorized(req, next, authService, tokenRefresh, toast, unauthorized, []);
    return { run, authService, tokenRefresh, warns };
  }

  const ok = () => of(new HttpResponse({ status: 204 }));

  it('reintenta la petición tras renovar el token', (done) => {
    const { run, authService, tokenRefresh } = setup(() => of(undefined));
    const next = jest.fn(ok);

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

  it('si el refresh falla avisa la sesión vencida, cierra la sesión y completa sin reintentar', (done) => {
    const { run, authService, tokenRefresh, warns } = setup(() =>
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    const next = jest.fn();

    run(next).subscribe({
      error: () => done.fail('debe completar con EMPTY, no propagar el error'),
      complete: () => {
        expect(next).not.toHaveBeenCalled();
        expect(authService.clearSession).toHaveBeenCalledTimes(1);
        expect(warns).toEqual(['Sesión expirada']);
        expect(tokenRefresh.refreshing).toBe(false);
        done();
      },
    });
  });

  it('sin sesión previa no avisa la sesión vencida', () => {
    const { run, authService, warns } = setup(
      () => throwError(() => new HttpErrorResponse({ status: 401 })),
      false,
    );

    run(jest.fn()).subscribe();

    expect(authService.clearSession).toHaveBeenCalled();
    expect(warns).toEqual([]);
  });

  it('varios 401 a la vez comparten un solo refresh', () => {
    const refresh$ = new Subject<void>();
    const { run, authService } = setup(() => refresh$);
    const next = jest.fn(ok);

    run(next).subscribe();
    run(next).subscribe();
    run(next).subscribe();
    refresh$.next();
    refresh$.complete();

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('un refresh fallido avisa una sola vez aunque esperaran varias peticiones', () => {
    const refresh$ = new Subject<void>();
    const { run, authService, warns } = setup(() => refresh$);
    const completadas: number[] = [];

    [1, 2, 3].forEach((n) => run(jest.fn()).subscribe({ complete: () => completadas.push(n) }));
    refresh$.error(new HttpErrorResponse({ status: 401 }));

    expect(completadas).toEqual([1, 2, 3]);
    expect(authService.clearSession).toHaveBeenCalledTimes(1);
    expect(warns).toEqual(['Sesión expirada']);
  });

  it('cancelar la petición que disparó el refresh no deja colgadas a las demás', () => {
    const refresh$ = new Subject<void>();
    const { run, authService, tokenRefresh, warns } = setup(() => refresh$);

    // La pantalla se destruye a mitad del refresh (`takeUntilDestroyed`).
    run(jest.fn()).subscribe().unsubscribe();

    let completada = false;
    run(jest.fn()).subscribe({ complete: () => (completada = true) });
    refresh$.error(new HttpErrorResponse({ status: 401 }));

    expect(completada).toBe(true);
    expect(authService.clearSession).toHaveBeenCalledTimes(1);
    expect(warns).toEqual(['Sesión expirada']);
    expect(tokenRefresh.refreshing).toBe(false);
  });

  it('tras un refresh terminado, un 401 nuevo dispara otro refresh', () => {
    const { run, authService } = setup(() => of(undefined));

    run(jest.fn(ok)).subscribe();
    run(jest.fn(ok)).subscribe();

    expect(authService.refresh).toHaveBeenCalledTimes(2);
  });
});
