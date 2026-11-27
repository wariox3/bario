/**
 * Acción declarativa de la toolbar.
 *
 * El consumidor declara su lista de acciones; el `<lib-data-toolbar>` solo
 * las renderiza y emite el `id` por `actionInvoked` cuando se hace click.
 * La lógica de qué hacer con cada acción vive en el consumidor.
 *
 * La jerarquía visual (primaria vs trailing) NO se declara aquí — se decide
 * por dónde se conecta: `primaryAction` para LA acción destacada,
 * `trailingActions` para el resto.
 */
export interface ToolbarAction {
  /** Identificador estable que el consumidor usa para discriminar acciones. */
  readonly id: string;
  /** Clave i18n del label visible. */
  readonly labelKey: string;
  /** Clase PrimeIcon, p. ej. `'pi pi-plus'`. Vacía para un botón solo con texto. */
  readonly iconClass: string;
  /**
   * Sub-acciones. Cuando está presente el botón se convierte en un dropdown;
   * `actionInvoked` emitirá el `id` del hijo seleccionado, no el del padre.
   */
  readonly children?: readonly ToolbarAction[];
  /**
   * Se ve pero no se puede usar. Vale para botones sueltos, la primaria y los
   * hijos de un dropdown. Es para lo que el **estado** todavía no permite (tabla
   * vacía, documento aprobado, otra operación en curso); lo que el usuario no
   * tiene **permiso** de hacer se quita del array, no se deshabilita.
   */
  readonly disabled?: boolean;
  /**
   * Botón suelto o primaria: la operación está corriendo. Cambia el ícono por un
   * spinner y deshabilita el botón.
   */
  readonly loading?: boolean;
  /**
   * Solo para los hijos de un dropdown: `'danger'` pinta el ítem en rojo. Para lo
   * destructivo (limpiar, eliminar todo), que además va al final del menú.
   */
  readonly severity?: 'default' | 'danger';
  /** Solo para los hijos de un dropdown: dibuja un separador antes del ítem. */
  readonly separatorBefore?: boolean;
}
