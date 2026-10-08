import { Injectable, inject } from '@angular/core';
import {
  ConfigMismatchError,
  DuplicateDocumentIdError,
  UnknownModuleError,
} from './errors/config.errors';
import { MODULE_REGISTRY } from './module-registry.token';
import type { ModuleConfig } from '@reddoc/core';

/**
 * Carga `ModuleConfig` desde el `MODULE_REGISTRY` inyectado y cachea
 * los resultados.
 *
 * SRP: no mantiene estado de navegación ni decide qué módulo está activo.
 * Eso lo hace `ModuleNavigationStore`.
 */
@Injectable({ providedIn: 'root' })
export class ModuleRegistryService {
  private readonly registry = inject(MODULE_REGISTRY);
  private readonly cache = new Map<string, ModuleConfig>();

  /**
   * Resuelve la configuración de un módulo. La primera llamada dispara
   * el dynamic import; las siguientes leen del cache.
   *
   * @throws {UnknownModuleError} si el id no está registrado.
   * @throws {ConfigMismatchError} si el config declara un id distinto al registry.
   * @throws {DuplicateDocumentIdError} si dos documentos comparten id.
   */
  async load(moduleId: string): Promise<ModuleConfig> {
    const cached = this.cache.get(moduleId);
    if (cached) return cached;

    const loader = this.registry[moduleId];
    if (!loader) throw new UnknownModuleError(moduleId);

    const config = await loader();
    this.assertValidConfig(config, moduleId);
    this.cache.set(moduleId, config);
    return config;
  }

  /**
   * Lista los ids de módulos registrados sin cargarlos.
   * Útil para construir el sidebar antes de navegar a un módulo concreto.
   */
  listRegisteredIds(): readonly string[] {
    return Object.keys(this.registry);
  }

  /**
   * Carga todos los módulos registrados en paralelo.
   * Los errores individuales se loggean pero no rompen el resto.
   */
  async loadAll(): Promise<readonly ModuleConfig[]> {
    const ids = this.listRegisteredIds();
    const settled = await Promise.allSettled(ids.map((id) => this.load(id)));
    return settled
      .filter((r): r is PromiseFulfilledResult<ModuleConfig> => {
        if (r.status === 'rejected') {
          console.error('[ModuleRegistry] Failed to load module:', r.reason);
          return false;
        }
        return true;
      })
      .map((r) => r.value);
  }

  private assertValidConfig(config: ModuleConfig, expectedId: string): void {
    if (config.id !== expectedId) {
      throw new ConfigMismatchError(expectedId, config.id);
    }
    const ids = config.documents.map((d) => d.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      throw new DuplicateDocumentIdError(expectedId, Array.from(new Set(duplicates)));
    }
  }
}
