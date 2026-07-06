/**
 * Tipos del menú del sidebar declarativo de la app Turnos.
 *
 * Dos clases de entradas de primer nivel:
 *   1. `SidebarSimpleItem` — un enlace directo (Inicio, etc.).
 *   2. `SidebarAccordion` — acordeón que agrupa varios items (Movimientos,
 *      Administración, Proceso).
 *
 * El acordeón puede contener uno o varios **grupos**. Cada grupo opcionalmente
 * declara un `labelKey` para mostrar un sub-header. Si no se declara, los
 * items del grupo aparecen directamente bajo el acordeón sin sub-header.
 */

/** Item simple del sidebar (Inicio, etc.). */
export interface SidebarSimpleItem {
  readonly kind: 'item';
  /** Clave i18n del label visible. */
  readonly labelKey: string;
  /** Clase PrimeIcon, p. ej. `'pi pi-home'`. */
  readonly iconClass: string;
  /**
   * Path al item, sin el prefijo `/t/<slug>/`.
   * Ej: `'inicio'` resuelve a `'/t/acme/inicio'`.
   */
  readonly path: string;
}

/** Item navegable dentro de un grupo (Puestos, Turnos, etc.). */
export interface SidebarLeafItem {
  readonly labelKey: string;
  /**
   * Path al item, sin el prefijo `/t/<slug>/`.
   * Ej: `'puestos'` resuelve a `'/t/acme/puestos'`.
   */
  readonly path: string;
}

/** Sub-grupo opcional dentro de un acordeón. */
export interface SidebarGroup {
  /** Si se declara, se renderiza como sub-header del grupo. Si no, los items van directos. */
  readonly labelKey?: string;
  readonly items: readonly SidebarLeafItem[];
}

/**
 * Acordeón de primer nivel en el sidebar.
 *
 * El `id` se usa solo para preservar el estado expand/collapse en memoria; no
 * afecta a las URLs.
 */
export interface SidebarAccordion {
  readonly kind: 'accordion';
  readonly id: string;
  readonly labelKey: string;
  readonly iconClass: string;
  /**
   * Si el acordeón arranca expandido. Default `false` (cerrado).
   */
  readonly defaultExpanded?: boolean;
  readonly groups: readonly SidebarGroup[];
}

/** Cualquier entrada de primer nivel del sidebar. */
export type SidebarSection = SidebarSimpleItem | SidebarAccordion;
