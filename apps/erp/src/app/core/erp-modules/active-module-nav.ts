import type { ActiveModuleStore } from './active-module.store';

/** Módulo por defecto cuando no hay uno activo (rutas globales o arranque). */
const FALLBACK_MODULE_ID = 'general';

/**
 * Helpers de navegación **agnóstica de módulo** para masters compartidos.
 *
 * Un master que vive físicamente en `general/masters/<x>` puede enrutarse desde
 * varios módulos (general, venta, compra…). En vez de hardcodear `'general'` en
 * breadcrumbs y `router.navigate`, las páginas derivan el módulo activo del
 * `ActiveModuleStore` (que `erpModuleResolver(id)` fija en la ruta raíz de cada
 * módulo) y construyen sus rutas con él. Así la navegación se queda en el módulo
 * desde el que se entró.
 */

/** Id del módulo activo, con fallback a `general`. */
export function currentModuleId(store: ActiveModuleStore): string {
  return store.activeId() ?? FALLBACK_MODULE_ID;
}

/**
 * Nombre visible del módulo activo, resolviendo `displayNameKey` del descriptor
 * contra el diccionario i18n (clave con notación de punto). Fallback: "General".
 */
export function resolveModuleName(store: ActiveModuleStore, dict: unknown): string {
  const key = store.activeDescriptor()?.displayNameKey ?? 'modules.general.name';
  let current: unknown = dict;
  for (const part of key.split('.')) {
    if (current === null || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}
