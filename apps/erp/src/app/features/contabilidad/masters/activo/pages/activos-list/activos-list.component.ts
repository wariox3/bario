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
import type { AppDict } from '@erp/i18n';
import { ActivoService } from '../../activo.service';
import type { Activo } from '../../activo.model';
import {
  ACTIVOS_COLUMNS,
  ACTIVOS_FILTER_FIELDS,
  ACTIVOS_FILTERS_STORAGE_KEY,
  ACTIVOS_QUICK_SEARCH_FIELD,
  ACTIVOS_PRIMARY_ACTION,
  ACTIVOS_ROW_ACTIONS,
  ACTIVOS_TRAILING_ACTIONS,
} from '../../activo.constants';

@Component({
  selector: 'app-activos-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './activos-list.component.html',
  styleUrl: './activos-list.component.scss',
})
export class ActivosListComponent {
  private readonly service = inject(ActivoService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly Activo[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Activo[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(ACTIVOS_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  protected readonly isExportingExcel = signal(false);

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      { label: this.t().entities.activo.name },
    ];
  });

  protected readonly columns = ACTIVOS_COLUMNS;
  protected readonly filterFields = ACTIVOS_FILTER_FIELDS;
  protected readonly rowActions = ACTIVOS_ROW_ACTIONS;
  protected readonly primaryAction = ACTIVOS_PRIMARY_ACTION;
  protected readonly trailingActions = ACTIVOS_TRAILING_ACTIONS;

  constructor() {
    this.loadList();
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadList();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort);
    this.currentPage.set(0);
    this.loadList();
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(ACTIVOS_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(ACTIVOS_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Activo[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const activo = event.row as Activo;
    switch (event.actionId) {
      case 'view':
        this.navigateTo('detalle', activo.id);
        break;
      case 'edit':
        this.navigateTo('editar', activo.id);
        break;
      case 'delete':
        this.confirmRemove([activo.id]);
        break;
    }
  }

  protected onRowClick(row: unknown): void {
    this.navigateTo('detalle', (row as Activo).id);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'new':
        this.navigateTo('nuevo');
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
    const ids = this.selectedRows().map((a) => a.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download('/contabilidad/activo/excel/', {
        method: 'POST',
        body: {
          filtros: buildFiltros(this.activeFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'activos.xlsx',
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
    const search = quickSearchCondition(ACTIVOS_QUICK_SEARCH_FIELD, this.searchValue());
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

  private navigateTo(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) throw new Error('Cannot navigate without an active tenant slug.');
    void this.router.navigate(['/t', slug, 'contabilidad', 'activos', ...subPath]);
  }
}
