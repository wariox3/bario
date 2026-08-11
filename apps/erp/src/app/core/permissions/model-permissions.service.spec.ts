import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AUTH_SERVICE, ENVIRONMENT, TenantService } from '@reddoc/core';
import { MODELO } from './modelo.catalog';
import { ModelPermissionsService } from './model-permissions.service';

const NIEGA = { ver: false, crear: false, editar: false, eliminar: false };
const URL_CONTACTO = `/api/general/modelo/${MODELO.general.contacto}/permiso/`;

describe('ModelPermissionsService · ciclo de vida de la cache', () => {
  let service: ModelPermissionsService;
  let http: HttpTestingController;
  let tenant: TenantService;
  let usuario: ReturnType<typeof signal<{ id: number } | null>>;

  beforeEach(() => {
    usuario = signal<{ id: number } | null>({ id: 1 });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
        { provide: AUTH_SERVICE, useValue: { currentUser: usuario } },
      ],
    });

    tenant = TestBed.inject(TenantService);
    tenant.setSlug('acme');

    service = TestBed.inject(ModelPermissionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cachea: la segunda consulta del mismo modelo no vuelve a pedir', async () => {
    const first = service.load(MODELO.general.contacto);
    const promise = new Promise((resolve) => first.subscribe(resolve));
    http.expectOne(URL_CONTACTO).flush(NIEGA);
    await promise;

    await new Promise((resolve) => service.load(MODELO.general.contacto).subscribe(resolve));
    http.expectNone(URL_CONTACTO);
    expect(service.allows(MODELO.general.contacto, 'ver')).toBe(false);
  });

  it('cambiar de usuario descarta lo aprendido', async () => {
    const promise = new Promise((resolve) =>
      service.load(MODELO.general.contacto).subscribe(resolve),
    );
    http.expectOne(URL_CONTACTO).flush(NIEGA);
    await promise;
    expect(service.allows(MODELO.general.contacto, 'ver')).toBe(false);

    // Sesión vencida y entra otra persona: `clearSession()` no toca el tenant,
    // así que el slug no cambia. Sin mirar al usuario, heredaría el `false`.
    usuario.set({ id: 2 });
    TestBed.tick();

    expect(service.grants(MODELO.general.contacto)).toBeUndefined();
    expect(service.allows(MODELO.general.contacto, 'ver')).toBe(true);
  });

  it('un fallo de red permite, pero no se recuerda: el próximo intento repregunta', async () => {
    const primera = new Promise((resolve) =>
      service.load(MODELO.general.contacto).subscribe(resolve),
    );
    http.expectOne(URL_CONTACTO).error(new ProgressEvent('error'));
    expect(await primera).toEqual({ ver: true, crear: true, editar: true, eliminar: true });

    // Nada guardado: el hipo de red no puede fijar "todo permitido" para siempre.
    expect(service.grants(MODELO.general.contacto)).toBeUndefined();

    const segunda = new Promise((resolve) =>
      service.load(MODELO.general.contacto).subscribe(resolve),
    );
    http.expectOne(URL_CONTACTO).flush(NIEGA);
    await segunda;
    expect(service.allows(MODELO.general.contacto, 'ver')).toBe(false);
  });

  it('la respuesta que llega después de un reset no se guarda', async () => {
    const promise = new Promise((resolve) =>
      service.load(MODELO.general.contacto).subscribe(resolve),
    );
    const pedido = http.expectOne(URL_CONTACTO);

    // Cambio de empresa con la petición en el aire.
    tenant.setSlug('otra');
    TestBed.tick();

    pedido.flush(NIEGA);
    await promise;

    // El `false` era del contenedor anterior: no puede gobernar al nuevo.
    expect(service.grants(MODELO.general.contacto)).toBeUndefined();
  });
});
