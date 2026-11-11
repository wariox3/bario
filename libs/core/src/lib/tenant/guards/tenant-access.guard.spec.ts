import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AUTH_SERVICE, ENVIRONMENT } from '../../tokens';
import { ToastService } from '../../services/toast.service';
import { TenantService } from '../tenant.service';
import { TENANT_ROUTES } from '../tenant.types';
import { tenantAccessGuard } from './tenant-access.guard';

@Component({ standalone: true, template: '' })
class StubComponent {}

const URL_MEMBRESIA = '/api/seguridad/usuario-cliente/usuario/?schema_name=acme';

/** El router evalúa el `canMatch` de forma asíncrona: la petición sale un tick después. */
const unTick = () => new Promise((resolve) => setTimeout(resolve));

describe('tenantAccessGuard', () => {
  let router: Router;
  let http: HttpTestingController;
  let tenant: TenantService;
  let toastWarn: jest.Mock;

  beforeEach(() => {
    toastWarn = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 't/:tenantSlug', canMatch: [tenantAccessGuard], component: StubComponent },
          { path: 'contenedores', component: StubComponent },
        ]),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        {
          provide: AUTH_SERVICE,
          useValue: { isAuthenticated: () => true, currentUser: signal({ id: 1 }) },
        },
        { provide: ToastService, useValue: { warn: toastWarn } },
        {
          provide: TENANT_ROUTES,
          useValue: {
            contenedoresRoot: '/contenedores',
            login: '/auth/login',
            tenantHome: (s: string) => `/t/${s}`,
          },
        },
      ],
    });

    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    tenant = TestBed.inject(TenantService);
  });

  afterEach(() => http.verify());

  it('valida con la membresía y deja el contenedor activo poblado', async () => {
    const navegacion = router.navigateByUrl('/t/acme');
    await unTick();
    http.expectOne(URL_MEMBRESIA).flush({
      id: 5,
      usuario_id: 15,
      usuario_nombre_corto: 'Ana',
      usuario_email: 'ana@acme.co',
      cliente_id: 8,
      propietario: true,
      soporte: false,
      administrador: false,
      grupos: [1, 7],
      cliente_nombre: 'Acme',
    });
    await navegacion;

    expect(router.url).toBe('/t/acme');
    // El mapeo completo lo cubre `membresia.mapper.spec`; acá, que se guardó.
    expect(tenant.currentContenedor()?.cliente_id).toBe(8);
    expect(tenant.currentContenedor()?.grupos).toEqual([1, 7]);
  });

  it('un 404 (no es miembro) avisa y vuelve a la lista de contenedores', async () => {
    const navegacion = router.navigateByUrl('/t/acme');
    await unTick();
    http
      .expectOne(URL_MEMBRESIA)
      .flush({ detail: 'No es miembro' }, { status: 404, statusText: 'Not Found' });
    await navegacion;

    expect(router.url).toBe('/contenedores');
    expect(toastWarn).toHaveBeenCalled();
    expect(tenant.currentContenedor()).toBeNull();
  });

  it('un 400 (schema inválido) también es sin acceso', async () => {
    const navegacion = router.navigateByUrl('/t/acme');
    await unTick();
    http
      .expectOne(URL_MEMBRESIA)
      .flush({ detail: 'schema_name inválido' }, { status: 400, statusText: 'Bad Request' });
    await navegacion;

    expect(router.url).toBe('/contenedores');
    expect(toastWarn).toHaveBeenCalled();
  });

  it('un error de red vuelve a la lista sin decir que no tiene acceso', async () => {
    const navegacion = router.navigateByUrl('/t/acme');
    await unTick();
    http.expectOne(URL_MEMBRESIA).error(new ProgressEvent('error'));
    await navegacion;

    expect(router.url).toBe('/contenedores');
    expect(toastWarn).not.toHaveBeenCalled();
  });

  it('si el contenedor activo ya es el del slug, no vuelve a preguntar', async () => {
    tenant.setCurrent({ schema_name: 'acme', cliente_id: 8, propietario: false, grupos: [] });

    await router.navigateByUrl('/t/acme');

    http.expectNone(() => true);
    expect(router.url).toBe('/t/acme');
  });
});
