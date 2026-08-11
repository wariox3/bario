import { type Signal, computed, inject } from '@angular/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { ModeloId } from './modelo.catalog';
import { PermissionsService } from './permissions.service';
import { visibleActions, visiblePrimaryAction } from './action-visibility';
import type { PermissionAction } from './permission.types';

/** Las acciones declarativas de una página de lista, tal como las define su master. */
export interface MasterActionsConfig {
  readonly row?: readonly RowAction[];
  readonly primary?: ToolbarAction;
  readonly trailing?: readonly ToolbarAction[];
}

/** Lo que la página pasa al toolbar y a la tabla, ya podado. */
export interface MasterActions {
  readonly rowActions: Signal<readonly RowAction[]>;
  /** `null` = no se dibuja. Es lo que espera `<lib-data-toolbar>`. */
  readonly primaryAction: Signal<ToolbarAction | null>;
  readonly trailingActions: Signal<readonly ToolbarAction[]>;
  readonly puedeCrear: Signal<boolean>;
  readonly puedeEditar: Signal<boolean>;
  /** Para el borrado por selección, que no es una acción declarativa. */
  readonly puedeEliminar: Signal<boolean>;
}

/**
 * Poda las acciones de una página de lista a lo que el usuario puede hacer
 * sobre el modelo de ese master.
 *
 * Las veinte listas del ERP declaran lo mismo —acciones de fila, botón
 * destacado, dropdown de acciones— así que sin esto cada una repetiría el
 * predicado y cuatro `computed` idénticos. Acá se declara una vez:
 *
 * ```ts
 * protected readonly acciones = masterActions(MODELO.general.contacto, {
 *   row: CONTACTOS_ROW_ACTIONS,
 *   primary: CONTACTOS_PRIMARY_ACTION,
 *   trailing: CONTACTOS_TRAILING_ACTIONS,
 * });
 * ```
 *
 * ```html
 * <lib-data-toolbar
 *   [primaryAction]="acciones.primaryAction()"
 *   [trailingActions]="acciones.trailingActions()"
 *   [deleteSelectedEnabled]="hasSelection() && acciones.puedeEliminar()"
 * />
 * <lib-data-table [rowActions]="acciones.rowActions()" />
 * ```
 *
 * **Cuando la pantalla monta, los grants ya están en cache**: los trajo el
 * `permissionGuard` al entrar. Los botones nacen decididos, no aparecen para
 * desaparecer un instante después.
 *
 * El permiso es del **modelo, que es global**, así que una lista compartida
 * (contactos se abre desde seis módulos) se comporta igual desde donde entres.
 *
 * Se llama en un **field initializer** del componente: usa `inject`.
 *
 * @param modelo Sin modelo en el backend (`undefined`) no se poda nada: no hay
 *   a quién preguntarle.
 */
export function masterActions(
  modelo: ModeloId | undefined,
  config: MasterActionsConfig,
): MasterActions {
  const permissions = inject(PermissionsService);
  const can = (accion: PermissionAction) => permissions.can(modelo, accion);

  return {
    rowActions: computed(() => visibleActions(config.row ?? [], can)),
    primaryAction: computed(() =>
      config.primary ? visiblePrimaryAction(config.primary, can) : null,
    ),
    trailingActions: computed(() => visibleActions(config.trailing ?? [], can)),
    puedeCrear: computed(() => can('crear')),
    puedeEditar: computed(() => can('editar')),
    puedeEliminar: computed(() => can('eliminar')),
  };
}
