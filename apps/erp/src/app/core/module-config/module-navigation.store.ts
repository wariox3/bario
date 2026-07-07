import { Injectable, computed, signal } from '@angular/core';
import { type DocumentEntityConfig, type ModuleConfig } from '@reddoc/core';

/**
 * Mantiene el módulo y el documento activos según la ruta actual del
 * framework configuracional (camino A).
 *
 * Los resolvers escriben aquí; los componentes leen vía signals.
 * Toda la lectura es síncrona — sin observables, sin race conditions.
 *
 * SRP: este store no carga configs (eso es `ModuleRegistryService`),
 * solo expone el estado actual de la navegación.
 */
@Injectable({ providedIn: 'root' })
export class ModuleNavigationStore {
  private readonly _activeModule = signal<ModuleConfig | null>(null);
  private readonly _activeDocument = signal<DocumentEntityConfig | null>(null);

  readonly activeModule = this._activeModule.asReadonly();
  readonly activeDocument = this._activeDocument.asReadonly();

  /** Filtros disponibles para el documento activo. Vacío si no hay documento. */
  readonly availableFilters = computed(() => this._activeDocument()?.filters ?? []);

  setActiveModule(config: ModuleConfig | null): void {
    this._activeModule.set(config);
  }

  setActiveDocument(config: DocumentEntityConfig | null): void {
    this._activeDocument.set(config);
  }
}
