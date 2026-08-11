import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideI18n } from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import { AccessDeniedPageComponent } from '../components/access-denied/access-denied.page';
import { PermissionsService } from './permissions.service';
import { ProtectedRouteError } from './access-denied-route';
import { withPermission } from './with-permission';
import { MODELO, type ModeloId } from './modelo.catalog';

@Component({ standalone: true, template: 'lista de contactos' })
class ContactosListStubComponent {}

/**
 * Stub de permisos: concede lo que se le diga en `allow`.
 *
 * `canResolve` es lo que usa el guard, y devuelve un Observable porque en la
 * vida real ahí se resuelve la petición al backend.
 */
class PermissionsStub {
  allow = new Set<ModeloId>();

  can(modelo: ModeloId | undefined): boolean {
    return modelo === undefined || this.allow.has(modelo);
  }

  canResolve(modelo: ModeloId | undefined): Observable<boolean> {
    return of(this.can(modelo));
  }
}

function setup(permissions: PermissionsStub) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideRouter([
        ...withPermission(MODELO.general.contacto, {
          path: 'contactos',
          children: [
            { path: '', component: ContactosListStubComponent },
            { path: ':id/editar', component: ContactosListStubComponent },
          ],
        }),
      ]),
      provideI18n(dictionaries),
      { provide: PermissionsService, useValue: permissions },
    ],
  });
}

describe('withPermission', () => {
  it('exige un path para poder construir la gemela', () => {
    expect(() => withPermission(MODELO.general.contacto, { redirectTo: 'x' })).toThrow(
      ProtectedRouteError,
    );
    expect(() => withPermission(MODELO.general.contacto, { path: '**' })).toThrow(
      ProtectedRouteError,
    );
  });

  it('conserva el `data` original de la ruta junto al permiso', () => {
    const [real] = withPermission(MODELO.general.contacto, {
      path: 'resoluciones',
      data: { tipo: 'venta' },
    });
    expect(real.data).toEqual({ tipo: 'venta', modelo: MODELO.general.contacto });
  });

  it('con permiso, abre la ruta real', async () => {
    const permissions = new PermissionsStub();
    permissions.allow.add(MODELO.general.contacto);
    setup(permissions);

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/contactos');

    expect(component).toBeInstanceOf(ContactosListStubComponent);
  });

  it('sin permiso, cae en la gemela sin perder la URL', async () => {
    setup(new PermissionsStub());

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/contactos');

    expect(component).toBeInstanceOf(AccessDeniedPageComponent);
    expect(TestBed.inject(Router).url).toBe('/contactos');
  });

  it('sin permiso, también cubre las sub-rutas del master', async () => {
    setup(new PermissionsStub());

    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/contactos/12/editar');

    expect(component).toBeInstanceOf(AccessDeniedPageComponent);
    expect(TestBed.inject(Router).url).toBe('/contactos/12/editar');
  });
});
