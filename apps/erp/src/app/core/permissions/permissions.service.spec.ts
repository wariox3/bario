import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MODELO } from './modelo.catalog';
import { ModelPermissionsService } from './model-permissions.service';
import { PermissionsService } from './permissions.service';

/** El backend ya dijo que no a este modelo, como el `{"ver":false,…}` real. */
class NiegaTodo {
  grants = () => ({ ver: false, crear: false, editar: false, eliminar: false });
  allows = () => false;
  load = () => of({ ver: false, crear: false, editar: false, eliminar: false });
  reset = () => undefined;
}

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), { provide: ModelPermissionsService, useClass: NiegaTodo }],
  });
  return TestBed.inject(PermissionsService);
}

describe('PermissionsService.canShowInMenu', () => {
  // El síntoma que esto previene: entrás a Contactos desde el sidebar y, al
  // volver la respuesta del backend, la entrada que acabás de tocar desaparece.
  // Un menú que se reordena bajo los pies se lee como un bug, no como un permiso.
  it('mantiene la entrada aunque el backend ya haya negado el modelo', () => {
    const permissions = setup();

    expect(permissions.can(MODELO.general.contacto)).toBe(false);
    expect(permissions.canShowInMenu(MODELO.general.contacto)).toBe(true);
  });

  it('una entrada sin modelo se muestra siempre', () => {
    expect(setup().canShowInMenu(undefined)).toBe(true);
  });
});
