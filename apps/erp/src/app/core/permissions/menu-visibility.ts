import type {
  SidebarAccordion,
  SidebarGroup,
  SidebarSection,
} from '../erp-modules/sidebar-menu.types';
import type { ModeloId } from './modelo.catalog';

/** Predicado de permiso. Se inyecta para que estas funciones queden puras. */
export type PermissionPredicate = (modelo: ModeloId | undefined) => boolean;

/**
 * Filtra el menú de un módulo a lo que el usuario puede ver.
 *
 * Poda de abajo hacia arriba: caen los items sin permiso, después los grupos
 * que quedaron sin items y por último los acordeones que quedaron sin grupos.
 * Sin eso el sidebar mostraría acordeones que se abren a la nada, que es peor
 * que no mostrarlos: parecen un bug, no una restricción.
 *
 * Una entrada que no declara `modelo` sobrevive siempre — es lo que permite ir
 * migrando módulo por módulo.
 */
export function visibleSections(
  sections: readonly SidebarSection[],
  can: PermissionPredicate,
): readonly SidebarSection[] {
  return sections.flatMap((section): SidebarSection[] => {
    if (section.kind === 'item') return can(section.modelo) ? [section] : [];

    const groups = visibleGroups(section, can);
    return groups.length > 0 ? [{ ...section, groups }] : [];
  });
}

function visibleGroups(
  accordion: SidebarAccordion,
  can: PermissionPredicate,
): readonly SidebarGroup[] {
  return accordion.groups.flatMap((group) => {
    const items = group.items.filter((item) => can(item.modelo));
    return items.length > 0 ? [{ ...group, items } satisfies SidebarGroup] : [];
  });
}

/**
 * ¿Vale la pena mostrar este módulo en el topbar?
 *
 * Sí cuando le queda al menos una entrada alcanzable **de las que declaran
 * modelo**. La distinción importa: casi todos los módulos tienen un "Inicio"
 * sin modelo, y contarlo haría que ningún módulo desapareciera nunca.
 *
 * Un módulo que todavía no declara ningún modelo se muestra entero. Así el
 * topbar no se vacía a medida que se migran módulos de a uno.
 */
export function hasVisibleMenu(
  sections: readonly SidebarSection[],
  can: PermissionPredicate,
): boolean {
  const declared = collectPermissions(sections);
  return declared.length === 0 || declared.some((modelo) => can(modelo));
}

/** Todos los modelos declarados en un menú, en orden de aparición. */
export function collectPermissions(sections: readonly SidebarSection[]): readonly ModeloId[] {
  return sections.flatMap((section) => {
    if (section.kind === 'item') return section.modelo ? [section.modelo] : [];
    return section.groups.flatMap((group) =>
      group.items.flatMap((item) => (item.modelo ? [item.modelo] : [])),
    );
  });
}
