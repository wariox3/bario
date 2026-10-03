import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { debounce, distinctUntilChanged, skip, timer } from 'rxjs';
import { I18nService } from '@reddoc/core';
import type { ToolbarAction } from './data-toolbar.types';

/**
 * Trailing action ya resuelta: si tiene `children`, el `menuItems` viene
 * precomputado como un `MenuItem[]` estable entre change detections.
 * Mantener una referencia estable es lo que evita el bug de "doble click" en
 * `<p-menu [model]>` — si el modelo cambia entre CDs el primer click se pierde.
 */
interface ResolvedTrailingAction extends ToolbarAction {
  readonly menuItems: MenuItem[] | null;
}

/**
 * Toolbar/header tonto para listados. Composición pura: recibe inputs,
 * emite eventos. No conoce HTTP, dominio ni la tabla bajo la cual vive.
 *
 * Diseñado para componerse con `<lib-data-table>` dentro de un wrapper
 * `.card` del feature page (ver `apps/erp/src/app/features/contactos/`).
 *
 * Layout (una sola fila, densidad calmada de ERP administrativo):
 *
 *   [search] [filtros] ←spacer→ [delete N] │ [trailing...] [refresh] [primary]
 *
 * Pasos comunes:
 *  - `searchEnabled` → input de búsqueda con icono e indicador de clear.
 *  - `filtersEnabled` → botón "Filtros" con badge de count; aparece "Limpiar"
 *    cuando `activeFiltersCount > 0`.
 *  - `deleteSelectedEnabled` + `deleteSelectedCount > 0` → botón danger
 *    contextual a la izquierda del divisor.
 *  - `trailingActions` → array declarativo (exportar, importar, etc.).
 *  - `refreshEnabled` → ícono-solo con tooltip.
 *  - `primaryAction` → un botón destacado a la derecha (Nuevo).
 *
 * Para casos especiales que no cubre este toolbar, el feature page puede:
 *  - Pasar la acción como una más en `trailingActions` y manejarla por id.
 *  - Componer un botón propio al lado de `<lib-data-toolbar>` dentro de la card.
 *  - Ignorar este componente y armar su HTML.
 */
@Component({
  selector: 'lib-data-toolbar',
  standalone: true,
  imports: [CommonModule, TooltipModule, MenuModule],
  templateUrl: './data-toolbar.component.html',
  styleUrl: './data-toolbar.component.scss',
})
export class DataToolbarComponent {
  // ── Búsqueda ──────────────────────────────────────────────────────────────
  readonly searchEnabled = input<boolean>(false);
  readonly searchValue = input<string>('');
  readonly searchPlaceholderKey = input<string>('common.search.placeholder');
  /** Debounce (ms) de la emisión de `searched`. `0` = inmediato. */
  readonly searchDebounce = input<number>(300);
  readonly searched = output<string>();

  /**
   * Valor mostrado en el input. Es local para que el tipeo sea responsivo aunque
   * la emisión de `searched` se retrase por el debounce; sigue a `searchValue`
   * cuando el consumidor lo cambia (binding controlado) y se sobreescribe al teclear.
   */
  protected readonly searchTerm = linkedSignal(() => this.searchValue());

  // ── Filtros ───────────────────────────────────────────────────────────────
  readonly filtersEnabled = input<boolean>(false);
  readonly activeFiltersCount = input<number>(0);
  readonly filtersToggle = output<void>();
  readonly filtersClear = output<void>();

  // ── Refresh ───────────────────────────────────────────────────────────────
  readonly refreshEnabled = input<boolean>(false);
  readonly refresh = output<void>();

  // ── Delete contextual ─────────────────────────────────────────────────────
  readonly deleteSelectedEnabled = input<boolean>(false);
  readonly deleteSelectedCount = input<number>(0);
  readonly deleteSelected = output<void>();

  // ── Acciones declarativas ────────────────────────────────────────────────
  readonly primaryAction = input<ToolbarAction | null>(null);
  readonly trailingActions = input<readonly ToolbarAction[]>([]);
  readonly actionInvoked = output<string>();

  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly i18n = inject<I18nService<unknown>>(I18nService);

  constructor() {
    // El término se emite ya debounced para no spamear al consumidor (un POST por
    // tecla). `skip(1)` ignora el valor inicial sembrado; `timer(term ? d : 0)`
    // hace que limpiar/vaciar salga al instante mientras el tipeo se debounce.
    toObservable(this.searchTerm)
      .pipe(
        skip(1),
        debounce((term) => timer(term ? this.searchDebounce() : 0)),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((term) => this.searched.emit(term));
  }

  // ── API protegida (template) ──────────────────────────────────────────────

  /**
   * Trailing actions con su `menuItems` ya resuelto. La referencia del array
   * es estable entre change detections y solo cambia cuando cambian
   * `trailingActions` o el idioma activo (a través del signal `i18n.t()`).
   *
   * Ojo: pasarle a `<p-menu [model]>` un array nuevo en cada CD provoca que
   * el primer click sobre un item se pierda — exactamente el bug que esto
   * evita.
   */
  protected readonly resolvedTrailingActions = computed<readonly ResolvedTrailingAction[]>(() => {
    // Leer `i18n.t()` dentro del computed para invalidarlo al cambiar de idioma.
    const dict = this.i18n.t();
    return this.trailingActions().map((action) => ({
      ...action,
      menuItems: action.children?.length
        ? action.children.map((child) => ({
            label: this.resolveKey(dict, child.labelKey),
            icon: child.iconClass,
            disabled: child.disabled ?? false,
            command: () => this.actionInvoked.emit(child.id),
          }))
        : null,
    }));
  });

  protected onSearchInput(event: Event): void {
    // Solo actualiza el display; la emisión la dispara el stream debounced.
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    // `timer(0)` del stream hace que la emisión de '' sea inmediata.
    this.searchTerm.set('');
  }

  /**
   * Resuelve una clave i18n con notación de punto contra el diccionario activo.
   * Devuelve la clave misma si no existe — facilita detectar faltantes en dev.
   */
  protected translate(key: string): string {
    return this.resolveKey(this.i18n.t(), key);
  }

  private resolveKey(dict: unknown, key: string): string {
    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }
}
