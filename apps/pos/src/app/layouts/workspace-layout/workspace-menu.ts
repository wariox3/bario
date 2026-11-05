/**
 * Entrada del sidebar del POS.
 *
 * El POS es mono-módulo y su menú es corto y plano (vender, caja, turno,
 * historial, configuración): no necesita los acordeones de turnos ni el menú por módulo
 * del ERP. `path` es relativo al tenant; el `WorkspaceLayout` le prepende
 * `/t/<slug>/`.
 */
export interface PosNavItem {
  /** Clave del bloque `layout.nav` del diccionario. */
  readonly labelKey: PosNavKey;
  /** Clase PrimeIcon, p. ej. `'pi pi-shopping-cart'`. */
  readonly iconClass: string;
  readonly path: string;
}

/** Secciones navegables del POS; cada una tiene su etiqueta en `layout.nav`. */
export type PosNavKey = 'vender' | 'caja' | 'turno' | 'historial' | 'configuracion';

export const WORKSPACE_MENU: readonly PosNavItem[] = [
  { labelKey: 'vender', iconClass: 'pi pi-shopping-cart', path: 'vender' },
  { labelKey: 'caja', iconClass: 'pi pi-wallet', path: 'caja' },
  { labelKey: 'turno', iconClass: 'pi pi-clock', path: 'turno' },
  { labelKey: 'historial', iconClass: 'pi pi-history', path: 'historial' },
  { labelKey: 'configuracion', iconClass: 'pi pi-cog', path: 'configuracion' },
];
