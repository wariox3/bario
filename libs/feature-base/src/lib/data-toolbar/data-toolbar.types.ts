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
   * Solo para los hijos de un dropdown: el ítem se ve pero no se puede elegir.
   * Para lo que la etapa todavía no permite, en vez de ocultarlo.
   */
  readonly disabled?: boolean;
}
