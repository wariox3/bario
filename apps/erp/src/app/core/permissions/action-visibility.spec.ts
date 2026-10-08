import { visibleActions, visiblePrimaryAction } from './action-visibility';
import type { PermissionAction } from './permission.types';

/** Concede solo las acciones listadas. */
const only =
  (...acciones: PermissionAction[]) =>
  (accion: PermissionAction) =>
    acciones.includes(accion);

const ROW_ACTIONS = [{ id: 'edit' }, { id: 'view' }, { id: 'delete' }] as const satisfies readonly {
  id: string;
}[];

const TRAILING = [
  {
    id: 'actions',
    children: [{ id: 'import' }, { id: 'export-excel' }],
  },
];

describe('visibleActions', () => {
  it('poda editar y eliminar, y deja pasar ver', () => {
    expect(visibleActions(ROW_ACTIONS, only('ver'))).toEqual([{ id: 'view' }]);
  });

  it('deja las acciones cuya id no mapea a ningún permiso', () => {
    const [group] = visibleActions(TRAILING, only('ver'));
    expect(group.children).toEqual([{ id: 'export-excel' }]);
  });

  it('elimina el grupo que se queda sin hijos', () => {
    const soloImportar = [{ id: 'actions', children: [{ id: 'import' }] }];
    expect(visibleActions(soloImportar, only('ver'))).toEqual([]);
  });

  it('no muta la lista original', () => {
    visibleActions(TRAILING, only('ver'));
    expect(TRAILING[0].children).toHaveLength(2);
  });
});

describe('visiblePrimaryAction', () => {
  it('devuelve null sin permiso de crear', () => {
    expect(visiblePrimaryAction({ id: 'new' }, only('ver'))).toBeNull();
  });

  it('devuelve la acción con permiso de crear', () => {
    expect(visiblePrimaryAction({ id: 'new' }, only('crear'))).toEqual({
      id: 'new',
    });
  });
});
