import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';
import {
  FileDownloadService,
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
  buildFiltros,
  buildOrdenamientos,
  quickSearchCondition,
  type FilterCondition,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  ListShellComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ItemService } from '../../item.service';
import type { Item } from '../../item.model';
import {
  ITEMS_COLUMNS,
  ITEMS_FILTER_FIELDS,
  ITEMS_FILTERS_STORAGE_KEY,
  ITEMS_QUICK_SEARCH_FIELD,
  ITEMS_PRIMARY_ACTION,
  ITEMS_ROW_ACTIONS,
  ITEMS_TRAILING_ACTIONS,
} from '../../item.constants';

/**
 * Listado de items (productos y servicios).
 *
 * Master administrativo del módulo General (`features/general/`).
 *
 * Camino B del enfoque híbrido: feature directo que compone los building
 * blocks compartidos (`<lib-data-toolbar>` + `<lib-data-table>`) dentro de
 * un wrapper `.card`. No usa `EntityConfig` del framework configuracional.
 */
@Component({
  selector: 'app-items-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './items-list.component.html',
  styleUrl: './items-list.component.scss',
})
export class ItemsListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(ItemService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Item[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Item[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(ITEMS_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  protected readonly isExportingExcel = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────
  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /**
   * Migas: módulo activo (navegable a su home) → entidad actual (Items).
   * El módulo se deriva del `ActiveModuleStore` (master compartido entre módulos).
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.item.name },
    ];
  });

  protected readonly columns = ITEMS_COLUMNS;
  protected readonly filterFields = ITEMS_FILTER_FIELDS;
  protected readonly rowActions = ITEMS_ROW_ACTIONS;
  protected readonly primaryAction = ITEMS_PRIMARY_ACTION;
  protected readonly trailingActions = ITEMS_TRAILING_ACTIONS;

  constructor() {
    this.loadList();
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadList();
  }

  /**
   * Ordenamiento multi-columna emitido por los headers de la tabla. Vuelve a
   * la primera página porque el orden cambia el conjunto visible.
   */
  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort);
    this.currentPage.set(0);
    this.loadList();
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  /**
   * Filtros confirmados desde el modal. Se persisten en localStorage para que
   * sobrevivan a recargas hasta que el usuario los limpie.
   */
  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(ITEMS_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(ITEMS_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Item[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const item = event.row as Item;
    switch (event.actionId) {
      case 'view':
        this.navigateToDetail(item.id);
        break;
      case 'edit':
        this.navigateToEdit(item.id);
        break;
      case 'delete':
        this.confirmRemove([item.id]);
        break;
    }
  }

  protected onRowClick(row: unknown): void {
    this.navigateToDetail((row as Item).id);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'new':
        this.router.navigate(this.buildRouteCommands('nuevo'));
        break;
      case 'export-excel':
        this.exportExcel();
        break;
    }
  }

  protected onRefresh(): void {
    this.loadList();
  }

  protected removeSelected(): void {
    const ids = this.selectedRows().map((c) => c.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download('/general/item/excel/', {
        method: 'POST',
        body: {
          filtros: buildFiltros(this.activeFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'items.xlsx',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isExportingExcel.set(false)),
      )
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  private loadList(): void {
    // La búsqueda rápida se añade como un filtro `contiene` más, combinado (AND)
    // con los filtros avanzados activos.
    const search = quickSearchCondition(ITEMS_QUICK_SEARCH_FIELD, this.searchValue());
    const filters = search ? [...this.activeFilters(), search] : this.activeFilters();

    const query: ListQuery = {
      filters,
      sort: this.sort(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.isLoading.set(true);
    this.service
      .list(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results);
          this.totalCount.set(response.count);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }

  private confirmRemove(ids: readonly number[]): void {
    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().common.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(ids),
    });
  }

  private executeRemove(ids: readonly number[]): void {
    this.service
      .remove(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(
            this.t().common.toasts.deleteSuccess.title,
            this.t().common.toasts.deleteSuccess.desc,
          );
          this.selectedRows.set([]);
          this.loadList();
        },
        error: () => {
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          );
        },
      });
  }

  private navigateToEdit(id: number): void {
    this.router.navigate(this.buildRouteCommands('editar', id));
  }

  private navigateToDetail(id: number): void {
    this.router.navigate(this.buildRouteCommands('detalle', id));
  }

  /**
   * Construye los segmentos absolutos para `router.navigate` dentro del feature.
   * Resulta en `/t/<slug>/<módulo activo>/items/<...path>`.
   */
  private buildRouteCommands(...subPath: (string | number)[]): (string | number)[] {
    const slug = this.tenant.currentSlug();
    if (!slug) throw new Error('Cannot navigate without an active tenant slug.');
    return ['/t', slug, currentModuleId(this.activeModule), 'items', ...subPath];
  }
}
