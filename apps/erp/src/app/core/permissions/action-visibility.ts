import type { ActionPredicate, PermissionAction } from './permission.types';

/**
 * Acción de UI → acción de permiso.
 *
 * Los ids son los que ya usan las toolbars y las filas del ERP. Lo que **no**
 * está acá pasa siempre: `view` lo cubre el permiso de la pantalla (si no podés
 * ver, no llegaste), y `export-excel` / `export-pdf` / `refresh` son lecturas de
 * lo que ya tenés en pantalla.
 *
 * `import` cuenta como `crear` porque eso es lo que hace: dar de alta registros
 * de a muchos.
 */
export const ACTION_PERMISSION_BY_ID: Readonly<Record<string, PermissionAction>> = {
  new: 'crear',
  import: 'crear',
  edit: 'editar',
  delete: 'eliminar',
};

/** Cualquier acción declarativa del ERP: las de toolbar y las de fila. */
interface IdentifiedAction {
  readonly id: string;
  readonly children?: readonly IdentifiedAction[];
}

/**
 * Poda una lista de acciones a las que el usuario puede ejecutar.
 *
 * Esconde en vez de deshabilitar: un botón deshabilitado que nunca se va a
 * habilitar es ruido. Los grupos (el dropdown "Acciones") se podan por dentro y
 * desaparecen si se quedan sin hijos — un menú que se abre vacío parece un bug.
 *
 * Un id sin acción asociada sobrevive siempre (ver `ACTION_PERMISSION_BY_ID`).
 *
 * `can` viene ya ligado al modelo de la pantalla
 * (`(accion) => permissions.can(MODELO.general.contacto, accion)`), así que estos
 * helpers no necesitan saber de qué recurso se trata.
 */
export function visibleActions<T extends IdentifiedAction>(
  actions: readonly T[],
  can: ActionPredicate,
): readonly T[] {
  return actions.flatMap((action): T[] => {
    const accion = ACTION_PERMISSION_BY_ID[action.id];
    if (accion !== undefined && !can(accion)) return [];

    if (action.children === undefined) return [action];

    const children = visibleActions(action.children, can);
    return children.length > 0 ? [{ ...action, children }] : [];
  });
}

/**
 * La acción destacada de la toolbar, o `null` si no le corresponde.
 * `<lib-data-toolbar>` no dibuja nada con `null`.
 */
export function visiblePrimaryAction<T extends IdentifiedAction>(
  action: T,
  can: ActionPredicate,
): T | null {
  return visibleActions([action], can)[0] ?? null;
}
