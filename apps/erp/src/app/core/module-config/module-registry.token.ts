import { InjectionToken } from '@angular/core';
import type { ModuleConfig } from '@reddoc/core';

/**
 * Función que carga la configuración de un módulo de forma asíncrona.
 *
 * Debe envolver un dynamic `import()` para que el bundler pueda
 * code-split el módulo y descargarlo solo cuando se necesite.
 *
 * @example
 * () => import('./features/compra/compra.config').then(m => m.COMPRA_CONFIG)
 */
export type ModuleConfigLoader = () => Promise<ModuleConfig>;

/**
 * Mapa de módulos disponibles en la aplicación.
 * La clave es el `id` del módulo y aparece en las URLs;
 * el valor es la función que lo carga lazy.
 */
export type ModuleRegistry = Readonly<Record<string, ModuleConfigLoader>>;

/**
 * InjectionToken del registry de módulos.
 *
 * El framework (libs/core) declara solo el contrato.
 * La aplicación concreta (apps/erp) provee la implementación con sus módulos
 * registrados en `app.config.ts`.
 *
 * Esto cumple DIP: el framework no depende de los features, los features
 * se conectan al framework vía DI.
 */
export const MODULE_REGISTRY = new InjectionToken<ModuleRegistry>('MODULE_REGISTRY');
