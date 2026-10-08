import { Injectable, computed, signal } from '@angular/core';
import type { ErpModuleDescriptor } from './erp-module.types';
import { ERP_ALL_MODULES } from './erp-modules.registry';

/**
 * Estado del módulo activo del ERP.
 *
 * Lo escribe `erpModuleResolver(id)` desde la ruta de cada módulo.
 * Lo leen el topbar (para highlight) y el sidebar (para filtrar al módulo).
 *
 * `null` significa "ningún módulo activo" — el usuario está en una ruta
 * global (dashboard, etc.).
 */
@Injectable({ providedIn: 'root' })
export class ActiveModuleStore {
  private readonly _activeId = signal<string | null>(null);
  readonly activeId = this._activeId.asReadonly();

  readonly activeDescriptor = computed<ErpModuleDescriptor | null>(() => {
    const id = this._activeId();
    if (!id) return null;
    // Busca en todos los descriptores, no solo en los del topbar: áreas como
    // Seguridad también aportan sidebar.
    return ERP_ALL_MODULES.find((m) => m.id === id) ?? null;
  });

  setActive(id: string | null): void {
    this._activeId.set(id);
  }
}
