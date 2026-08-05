import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  AUTH_SERVICE,
  ENVIRONMENT,
  TENANT_ROUTES,
  TenantService,
  provideI18n,
  tenantAccessGuard,
  tenantSlugMatchGuard,
} from '@reddoc/core';
import { MessageService } from 'primeng/api';
import { dictionaries } from '@erp/i18n';
import { AccessDeniedPageComponent } from '../components/access-denied/access-denied.page';
import { withModuleAccess } from './with-module-access';

@Component({ standalone: true, template: 'venta' })
class VentaStubComponent {}

/** Como lo manda el backend: la empresa no contrató Venta. */
const CONTENEDOR = {
  cliente_id: 13,
  schema_name: 'seguridad',
  nombre: 'Seguridad',
  activo: true,
  rol_id: 1,
  acceso_venta: false,
  acceso_tesoreria: true,
};

/**
 * Un módulo fuera del plan no se abre **ni por URL directa en recarga dura**.
 *
 * Es el caso que se escapaba: `moduleAccessGuard` es `canMatch` y lee las flags
 * del contenedor, pero el contenedor lo poblaba un `canActivate`, que corre
 * después de todos los `canMatch`. Con el contenedor en `null`, "no hay flags"
 * se lee como "sin restricción" y Venta abría. Navegando dentro de la app sí
 * bloqueaba —ahí ya estaba cargado—, o sea que el mismo link se comportaba
 * distinto según cómo llegaras.
 */
describe('acceso a módulos · recarga dura sobre un módulo fuera del plan', () => {
  let http: HttpTestingController;

  /** La navegación es asíncrona: el guard corre después del microtask actual. */
  const dejarCorrerElGuard = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideI18n(dictionaries),
        MessageService,
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        {
          provide: AUTH_SERVICE,
          useValue: { currentUser: signal({ id: 1 }), isAuthenticated: () => true },
        },
        { provide: TENANT_ROUTES, useValue: { contenedoresRoot: '/contenedores' } },
        provideRouter([
          {
            path: 't/:tenantSlug',
            canMatch: [tenantSlugMatchGuard, tenantAccessGuard],
            children: [
              ...withModuleAccess('venta', {
                path: 'venta',
                children: [{ path: 'contactos', component: VentaStubComponent }],
              }),
            ],
          },
        ]),
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  it('cae en el acceso denegado sin perder la URL', async () => {
    const harness = await RouterTestingHarness.create();
    const navegacion = harness.navigateByUrl('/t/seguridad/venta/contactos');
    await dejarCorrerElGuard();

    // Lo que hace el guard de acceso al no tener el contenedor en memoria.
    http
      .expectOne('/api/contenedor/cliente/lista-usuario/')
      .flush({ count: 1, results: [CONTENEDOR] });

    expect(await navegacion).toBeInstanceOf(AccessDeniedPageComponent);
    expect(TestBed.inject(Router).url).toBe('/t/seguridad/venta/contactos');
  });

  it('con el contenedor poblado al activar, el módulo abría — el bug que arregla', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideI18n(dictionaries),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        {
          provide: AUTH_SERVICE,
          useValue: { currentUser: signal({ id: 1 }), isAuthenticated: () => true },
        },
        provideRouter([
          {
            path: 't/:tenantSlug',
            // Como estaba antes: el contenedor llegaba en un `canActivate`, que
            // corre después de todos los `canMatch`.
            canActivate: [
              () => {
                TestBed.inject(TenantService).setCurrent(CONTENEDOR);
                return true;
              },
            ],
            children: [
              ...withModuleAccess('venta', {
                path: 'venta',
                children: [{ path: 'contactos', component: VentaStubComponent }],
              }),
            ],
          },
        ]),
      ],
    });

    const harness = await RouterTestingHarness.create();
    const componente = await harness.navigateByUrl('/t/seguridad/venta/contactos');

    // Venta abierta pese a `acceso_venta: false`.
    expect(componente).toBeInstanceOf(VentaStubComponent);
  });

  it('un módulo que sí está en el plan abre normal', async () => {
    const harness = await RouterTestingHarness.create();
    const navegacion = harness.navigateByUrl('/t/seguridad/venta/contactos');
    await dejarCorrerElGuard();
    http
      .expectOne('/api/contenedor/cliente/lista-usuario/')
      .flush({ count: 1, results: [{ ...CONTENEDOR, acceso_venta: true }] });

    expect(await navegacion).toBeInstanceOf(VentaStubComponent);
  });
});
