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

/** Membresía de `/seguridad/usuario-cliente/usuario/`: lo que valida la recarga dura. */
const MEMBRESIA = {
  id: 21,
  usuario_id: 1,
  usuario_nombre_corto: 'Ana',
  usuario_email: 'ana@seguridad.co',
  cliente_id: 13,
  propietario: false,
  soporte: false,
  is_superuser: false,
  // Contabilidad (7), no Venta (1).
  grupos: [7],
};

const URL_MEMBRESIA = '/api/seguridad/usuario-cliente/usuario/?schema_name=seguridad';

/**
 * Un módulo fuera del plan no se abría **ni por URL directa en recarga dura**.
 *
 * Es el caso que se escapaba: `moduleAccessGuard` es `canMatch` y lee las flags
 * del contenedor, pero el contenedor lo poblaba un `canActivate`, que corre
 * después de todos los `canMatch`. Con el contenedor en `null`, "no hay flags"
 * se lee como "sin restricción" y Venta abría. Navegando dentro de la app sí
 * bloqueaba —ahí ya estaba cargado—, o sea que el mismo link se comportaba
 * distinto según cómo llegaras.
 *
 * Hoy el acceso sale de los **grupos** de la membresía (ver `GRUPO_ACCESO`), que
 * el guard de acceso trae en la recarga dura: tiene que dejarlos en el tenant
 * **antes** de que el guard de módulos decida.
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
          { path: 'contenedores', component: VentaStubComponent },
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

  it('sin el grupo de Venta cae en el acceso denegado sin perder la URL', async () => {
    const harness = await RouterTestingHarness.create();
    const navegacion = harness.navigateByUrl('/t/seguridad/venta/contactos');
    await dejarCorrerElGuard();

    // Lo que hace el guard de acceso al no tener el contenedor en memoria.
    http.expectOne(URL_MEMBRESIA).flush(MEMBRESIA);

    expect(await navegacion).toBeInstanceOf(AccessDeniedPageComponent);
    expect(TestBed.inject(Router).url).toBe('/t/seguridad/venta/contactos');
  });

  it('con el grupo de Venta abre normal y deja el contenedor poblado', async () => {
    const harness = await RouterTestingHarness.create();
    const navegacion = harness.navigateByUrl('/t/seguridad/venta/contactos');
    await dejarCorrerElGuard();
    http.expectOne(URL_MEMBRESIA).flush({ ...MEMBRESIA, grupos: [1, 7] });

    expect(await navegacion).toBeInstanceOf(VentaStubComponent);
    expect(TestBed.inject(TenantService).currentContenedor()?.cliente_id).toBe(13);
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
                TestBed.inject(TenantService).setCurrent({
                  schema_name: 'seguridad',
                  cliente_id: MEMBRESIA.cliente_id,
                  propietario: false,
                  grupos: MEMBRESIA.grupos,
                });
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

    // Venta abierta pese a no tener el grupo de Venta.
    expect(componente).toBeInstanceOf(VentaStubComponent);
  });

  it('sin membresía (404) no abre el módulo', async () => {
    const harness = await RouterTestingHarness.create();
    const navegacion = harness.navigateByUrl('/t/seguridad/venta/contactos');
    await dejarCorrerElGuard();
    http
      .expectOne(URL_MEMBRESIA)
      .flush({ detail: 'No es miembro' }, { status: 404, statusText: 'Not Found' });

    await navegacion;
    expect(TestBed.inject(Router).url).toBe('/contenedores');
  });
});
