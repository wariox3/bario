import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { ModuleRegistryService } from '../module-registry.service';
import { ModuleNavigationStore } from '../module-navigation.store';
import type { ModuleConfig } from '@reddoc/core';

/**
 * Crea un resolver que carga el `ModuleConfig` del id indicado y lo registra
 * como activo en el `ModuleNavigationStore` antes de que cualquier ruta
 * hija se monte.
 *
 * Uso:
 *   ```ts
 *   {
 *     path: 'compra',
 *     resolve: { module: activeModuleResolver('compra') },
 *     children: [...]
 *   }
 *   ```
 *
 * El componente puede leer el resultado vía `withComponentInputBinding()`:
 *   ```ts
 *   readonly module = input.required<ModuleConfig>();
 *   ```
 *
 * Si la carga falla, el error tipado (`UnknownModuleError`, etc.) propaga al
 * `ErrorHandler` global, que decide cómo manejarlo (redirect, toast, etc.).
 */
export function activeModuleResolver(moduleId: string): ResolveFn<ModuleConfig> {
  return async () => {
    const registry = inject(ModuleRegistryService);
    const navigationStore = inject(ModuleNavigationStore);
    const config = await registry.load(moduleId);
    navigationStore.setActiveModule(config);
    return config;
  };
}
