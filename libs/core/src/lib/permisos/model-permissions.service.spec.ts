import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { AUTH_SERVICE, ENVIRONMENT } from '../tokens';
import { MODELO } from './modelo.catalog';
import { ModelPermissionsService } from './model-permissions.service';

const PERMITE_TODO = { ver: true, crear: true, editar: true, eliminar: true };

describe('ModelPermissionsService · sin endpoint de permisos', () => {
  let service: ModelPermissionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: AUTH_SERVICE, useValue: { currentUser: signal({ id: 1 }) } },
      ],
    });

    TestBed.inject(TenantService).setSlug('acme');
    service = TestBed.inject(ModelPermissionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('permite todo sin hacer ninguna petición', async () => {
    const grants = await firstValueFrom(service.load(MODELO.general.contacto));

    expect(grants).toEqual(PERMITE_TODO);
    http.expectNone(() => true);
  });

  it('lo resuelto queda en cache y permite cada acción', async () => {
    await firstValueFrom(service.load(MODELO.general.contacto));

    expect(service.grants(MODELO.general.contacto)).toEqual(PERMITE_TODO);
    expect(service.allows(MODELO.general.contacto, 'eliminar')).toBe(true);
  });
});
