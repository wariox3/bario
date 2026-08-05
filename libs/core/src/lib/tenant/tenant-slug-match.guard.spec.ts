import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { type CanMatchFn, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TenantService } from './tenant.service';
import { tenantSlugMatchGuard } from './tenant-slug-match.guard';

@Component({ standalone: true, template: 'contactos' })
class ContactosStubComponent {}

/**
 * El orden que importa: un `canMatch` anidado —como el guard de permisos del
 * ERP, que consulta al backend— corre **antes** que cualquier `canActivate`.
 * Si el tenant se marcara al activar, ese guard pediría sin `X-Tenant` y el
 * backend resolvería contra el schema público (404 en recarga dura).
 */
describe('tenantSlugMatchGuard', () => {
  /** Qué slug había cuando corrió el `canMatch` del hijo. */
  let slugAlMatchear: string | null | undefined;
  /** Qué slug había cuando corrió el `canActivate` del padre. */
  let slugAlActivar: string | null | undefined;

  const espiaCanMatch: CanMatchFn = () => {
    slugAlMatchear = inject(TenantService).currentSlug();
    return true;
  };

  beforeEach(() => {
    slugAlMatchear = undefined;
    slugAlActivar = undefined;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          {
            path: 't/:tenantSlug',
            canMatch: [tenantSlugMatchGuard],
            canActivate: [
              () => {
                slugAlActivar = TestBed.inject(TenantService).currentSlug();
                return true;
              },
            ],
            children: [
              {
                path: 'venta/contactos',
                canMatch: [espiaCanMatch],
                component: ContactosStubComponent,
              },
            ],
          },
        ]),
      ],
    });
  });

  it('deja el tenant marcado antes de que corra un canMatch anidado', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/t/acme/venta/contactos');

    expect(slugAlMatchear).toBe('acme');
    expect(TestBed.inject(TenantService).currentSlug()).toBe('acme');
  });

  it('el canMatch anidado corre antes del canActivate del padre', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/t/acme/venta/contactos');

    // Deja constancia del porqué de este guard: marcar el tenant al activar
    // llega tarde para el hijo.
    expect(slugAlActivar).toBe('acme');
    expect(slugAlMatchear).toBe('acme');
  });

  it('sin el guard, el canMatch anidado corre sin tenant — el bug que arregla', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          {
            path: 't/:tenantSlug',
            // Como estaba antes: el tenant se marcaba recién al activar.
            canActivate: [
              (route) => {
                TestBed.inject(TenantService).setSlug(route.paramMap.get('tenantSlug') ?? '');
                return true;
              },
            ],
            children: [
              {
                path: 'venta/contactos',
                canMatch: [espiaCanMatch],
                component: ContactosStubComponent,
              },
            ],
          },
        ]),
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/t/acme/venta/contactos');

    // Acá es donde la petición de permisos salía sin `X-Tenant`.
    expect(slugAlMatchear).toBeNull();
  });
});
