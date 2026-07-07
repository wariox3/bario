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
import type { AppDict } from '@turnos/i18n';
import { TurnoService } from '../../turno.service';
import type { Turno } from '../../turno.model';
import {
  TURNOS_COLUMNS,
  TURNOS_FILTER_FIELDS,
  TURNOS_FILTERS_STORAGE_KEY,
  TURNOS_QUICK_SEARCH_FIELD,
  TURNOS_PRIMARY_ACTION,
  TURNOS_ROW_ACTIONS,
  TURNOS_TRAILING_ACTIONS,
} from '../../turno.constants';

/**
 * Listado de turnos (jornadas).
 *
 * Master administrativo del módulo Turno (`features/turno/`).
 *
 * Camino B del enfoque híbrido: feature directo que compone los building
 * blocks compartidos (`<lib-data-toolbar>` + `<lib-data-table>`) dentro de
 * un wrapper `.card`. No usa `EntityConfig` del framework configuracional.
 */
@Component({
  selector: 'app-turnos-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './turnos-list.component.html',
  styleUrl: './turnos-list.component.scss',
})
export class TurnosListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(TurnoService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Turno[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Turno[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(TURNOS_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  protected readonly isExportingExcel = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────
  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /**
   * Migas: módulo (Turno, navegable a su home) → entidad actual (Turnos).
   * El turno es un master del módulo `turno`, por eso el segmento es fijo.
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      { label: this.t().entities.turno.name },
    ];
  });

  protected readonly columns = TURNOS_COLUMNS;
  protected readonly filterFields = TURNOS_FILTER_FIELDS;
  protected readonly rowActions = TURNOS_ROW_ACTIONS;
  protected readonly primaryAction = TURNOS_PRIMARY_ACTION;
  protected readonly trailingActions = TURNOS_TRAILING_ACTIONS;

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
    this.filterStorage.write(TURNOS_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(TURNOS_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Turno[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const turno = event.row as Turno;
    switch (event.actionId) {
      case 'view':
        this.navigateToDetail(turno.id);
        break;
      case 'edit':
        this.navigateToEdit(turno.id);
        break;
      case 'delete':
        this.confirmRemove([turno.id]);
        break;
    }
  }

  protected onRowClick(row: unknown): void {
    this.navigateToDetail((row as Turno).id);
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
    const ids = this.selectedRows().map((turno) => turno.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download('/turno/turno/excel/', {
        method: 'POST',
        body: {
          filtros: buildFiltros(this.activeFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'turnos.xlsx',
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
    const search = quickSearchCondition(TURNOS_QUICK_SEARCH_FIELD, this.searchValue());
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
   * Resulta en `/t/<slug>/turnos/<...path>`.
   */
  private buildRouteCommands(...subPath: (string | number)[]): (string | number)[] {
    const slug = this.tenant.currentSlug();
    if (!slug) throw new Error('Cannot navigate without an active tenant slug.');
    return ['/t', slug, 'turnos', ...subPath];
  }
}
