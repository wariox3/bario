import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { provideI18n } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import { AccessDeniedPageComponent } from '../components/access-denied/access-denied.page';
import { MODELO } from './modelo.catalog';
import { ModelPermissionsService } from './model-permissions.service';
import { withPermission } from './with-permission';

/** Reproduce el árbol real: módulo con índice, un master protegido y hermanos. */
@Component({ standalone: true, template: 'inicio' })
class InicioStubComponent {}

@Component({ standalone: true, template: 'contactos' })
class ContactosStubComponent {}

/** El backend dice que no a todo, como el `{"ver":false,…}` real. */
class NiegaTodo {
  grants = () => ({ ver: false, crear: false, editar: false, eliminar: false });
  allows = () => false;
  load = () => of({ ver: false, crear: false, editar: false, eliminar: false });
  reset = () => undefined;
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideRouter([
        {
          path: 'venta',
          children: [
            { path: '', pathMatch: 'full', redirectTo: 'inicio' },
            { path: 'inicio', component: InicioStubComponent },
            ...withPermission(MODELO.general.contacto, {
              path: 'contactos',
              children: [{ path: '', component: ContactosStubComponent }],
            }),
          ],
        },
        { path: '**', redirectTo: '' },
      ]),
      provideI18n(dictionaries),
      { provide: ModelPermissionsService, useClass: NiegaTodo },
    ],
  });
}

describe('permissionGuard dentro del árbol de un módulo', () => {
  it('sin permiso, muestra el acceso denegado sin perder la URL', async () => {
    setup();
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/venta/contactos');

    expect(component).toBeInstanceOf(AccessDeniedPageComponent);
    expect(TestBed.inject(Router).url).toBe('/venta/contactos');
  });
});
