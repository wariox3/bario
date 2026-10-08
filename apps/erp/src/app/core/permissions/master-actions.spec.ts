import { TestBed } from '@angular/core/testing';
import { MODELO } from './modelo.catalog';
import { ModelPermissionsService } from './model-permissions.service';
import { masterActions } from './master-actions';

const ROW = [{ id: 'edit' }, { id: 'view' }, { id: 'delete' }] as never;
const PRIMARY = { id: 'new' } as never;
const TRAILING = [{ id: 'actions', children: [{ id: 'import' }, { id: 'export-excel' }] }] as never;

describe('masterActions', () => {
  function armar(...acciones: readonly string[]) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ModelPermissionsService,
          useValue: { allows: (_m: number, accion: string) => acciones.includes(accion) },
        },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      masterActions(MODELO.general.contacto, { row: ROW, primary: PRIMARY, trailing: TRAILING }),
    );
  }

  it('solo ver: sin "Nuevo", sin editar ni eliminar, y sin importar', () => {
    const acciones = armar('ver');

    expect(acciones.primaryAction()).toBeNull();
    expect(acciones.rowActions()).toEqual([{ id: 'view' }]);
    expect(acciones.trailingActions()[0].children).toEqual([{ id: 'export-excel' }]);
    expect(acciones.puedeEliminar()).toBe(false);
  });

  it('con todo concedido, no poda nada', () => {
    const acciones = armar('ver', 'crear', 'editar', 'eliminar');

    expect(acciones.primaryAction()).toEqual(PRIMARY);
    expect(acciones.rowActions()).toHaveLength(3);
    expect(acciones.puedeCrear()).toBe(true);
    expect(acciones.puedeEditar()).toBe(true);
    expect(acciones.puedeEliminar()).toBe(true);
  });

  it('sin modelo no poda: no hay a quién preguntarle', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ModelPermissionsService, useValue: { allows: () => false } }],
    });
    const acciones = TestBed.runInInjectionContext(() =>
      masterActions(undefined, { row: ROW, primary: PRIMARY }),
    );

    expect(acciones.primaryAction()).toEqual(PRIMARY);
    expect(acciones.rowActions()).toHaveLength(3);
  });
});
