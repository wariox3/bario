import type { SidebarSection } from '../erp-modules/sidebar-menu.types';
import { collectPermissions, hasVisibleMenu, visibleSections } from './menu-visibility';
import { MODELO, type ModeloId } from './modelo.catalog';

/** Menú de prueba: un item libre, un acordeón con dos grupos permisados. */
const MENU: readonly SidebarSection[] = [
  { kind: 'item', labelKey: 'inicio', iconClass: 'pi pi-home', path: 'inicio' },
  {
    kind: 'accordion',
    id: 'administracion',
    labelKey: 'masters',
    iconClass: 'pi pi-folder',
    groups: [
      {
        labelKey: 'grupo-a',
        items: [
          { labelKey: 'contactos', path: 'contactos', modelo: MODELO.general.contacto },
          { labelKey: 'items', path: 'items', modelo: MODELO.general.item },
        ],
      },
      {
        labelKey: 'grupo-b',
        items: [{ labelKey: 'cuentas', path: 'cuentas-banco', modelo: MODELO.general.cuentaBanco }],
      },
    ],
  },
];

/** Predicado que concede solo los modelos listados. */
const only =
  (...granted: ModeloId[]) =>
  (modelo: ModeloId | undefined) =>
    modelo === undefined || granted.includes(modelo);

describe('visibleSections', () => {
  it('deja pasar las entradas sin permiso declarado', () => {
    const [first] = visibleSections(MENU, only());
    expect(first).toEqual(MENU[0]);
  });

  it('poda el item sin permiso y conserva el hermano', () => {
    const sections = visibleSections(
      MENU,
      only(MODELO.general.contacto, MODELO.general.cuentaBanco),
    );
    const accordion = sections[1];
    if (accordion.kind !== 'accordion') throw new Error('se esperaba el acordeón');

    expect(accordion.groups.map((g) => g.items.map((i) => i.path))).toEqual([
      ['contactos'],
      ['cuentas-banco'],
    ]);
  });

  it('elimina el grupo que se queda sin items', () => {
    const sections = visibleSections(MENU, only(MODELO.general.contacto));
    const accordion = sections[1];
    if (accordion.kind !== 'accordion') throw new Error('se esperaba el acordeón');

    expect(accordion.groups).toHaveLength(1);
    expect(accordion.groups[0].labelKey).toBe('grupo-a');
  });

  it('elimina el acordeón que se queda sin grupos', () => {
    expect(visibleSections(MENU, only())).toHaveLength(1);
  });

  it('no muta el menú original', () => {
    visibleSections(MENU, only());
    const original = MENU[1];
    if (original.kind !== 'accordion') throw new Error('se esperaba el acordeón');
    expect(original.groups).toHaveLength(2);
  });
});

describe('hasVisibleMenu', () => {
  it('es false cuando no queda ninguna entrada permisada, aunque quede "Inicio"', () => {
    expect(hasVisibleMenu(MENU, only())).toBe(false);
  });

  it('basta un permiso para que el módulo siga en el topbar', () => {
    expect(hasVisibleMenu(MENU, only(MODELO.general.item))).toBe(true);
  });

  it('un módulo que aún no declara permisos se muestra entero', () => {
    const sinPermisos: readonly SidebarSection[] = [MENU[0]];
    expect(collectPermissions(sinPermisos)).toEqual([]);
    expect(hasVisibleMenu(sinPermisos, only())).toBe(true);
  });
});
