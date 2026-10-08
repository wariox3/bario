import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { delay, of } from 'rxjs';
import { ENVIRONMENT, provideI18n } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import { AccessDeniedPageComponent } from '@erp/core/components/access-denied/access-denied.page';
import { ModelPermissionsService, withModuleAccess } from '@erp/core/permissions';
import { ERP_MODULE_REGISTRY, MODULE_REGISTRY } from '@erp/core/module-config';
import { VENTA_ROUTES } from './venta.routes';

/**
 * El backend niega todo, como el `{"ver":false,…}` que devuelve hoy.
 * `delay` porque la respuesta real es asíncrona — es la diferencia que importa.
 */
class NiegaTodo {
  private readonly no = { ver: false, crear: false, editar: false, eliminar: false };
  grants = () => this.no;
  allows = () => false;
  load = () => of(this.no).pipe(delay(0));
  reset = () => undefined;
}

function setup(routes: Parameters<typeof provideRouter>[0]) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideRouter(routes),
      provideI18n(dictionaries),
      { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      { provide: MODULE_REGISTRY, useValue: ERP_MODULE_REGISTRY },
      { provide: ModelPermissionsService, useClass: NiegaTodo },
    ],
  });
}

describe('VENTA_ROUTES · master sin permiso', () => {
  it('montadas solas: cae en el acceso denegado, no en un redirect', async () => {
    setup([...VENTA_ROUTES, { path: '**', redirectTo: '' }]);

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/contactos');

    expect(TestBed.inject(Router).url).toBe('/contactos');
    expect(component).toBeInstanceOf(AccessDeniedPageComponent);
  });

  it('bajo el tenant y `withModuleAccess`, como en la app real', async () => {
    setup([
      {
        path: 't/:tenantSlug',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'general/inicio' },
          ...withModuleAccess('venta', {
            path: 'venta',
            loadChildren: () => Promise.resolve(VENTA_ROUTES),
          }),
        ],
      },
      { path: '**', redirectTo: '' },
    ]);

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/t/acme/venta/contactos');

    expect(TestBed.inject(Router).url).toBe('/t/acme/venta/contactos');
    expect(component).toBeInstanceOf(AccessDeniedPageComponent);
  });
});
