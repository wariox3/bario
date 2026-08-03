import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  FileDownloadService,
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
  buildFiltros,
  buildOrdenamientos,
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
import { ConciliacionService } from '../../conciliacion.service';
import type { Conciliacion } from '../../conciliacion.model';
import {
  CONCILIACIONES_COLUMNS,
  CONCILIACIONES_FILTER_FIELDS,
  CONCILIACIONES_FILTERS_STORAGE_KEY,
  CONCILIACIONES_PRIMARY_ACTION,
  CONCILIACIONES_ROW_ACTIONS,
  CONCILIACIONES_TRAILING_ACTIONS,
  CONCILIACION_LIST_PATH,
} from '../../conciliacion.constants';

/**
 * Listado de **conciliaciones bancarias**.
 *
 * Master con endpoint propio: paginación, filtros, alta/edición/ficha, borrado
 * (por fila y múltiple) y Excel. Reusa los building blocks compartidos, igual
 * que el resto de masters del ERP.
 */
@Component({
  selector: 'app-conciliaciones-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './conciliaciones-list.component.html',
  styleUrl: './conciliaciones-list.component.scss',
})
export class ConciliacionesListComponent {
  private readonly service = inject(ConciliacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly Conciliacion[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Conciliacion[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(CONCILIACIONES_FILTERS_STORAGE_KEY),
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
      { label: this.t().entities.conciliacion.name },
    ];
  });

  protected readonly columns = CONCILIACIONES_COLUMNS;
  protected readonly filterFields = CONCILIACIONES_FILTER_FIELDS;
  protected readonly rowActions = CONCILIACIONES_ROW_ACTIONS;
  protected readonly primaryAction = CONCILIACIONES_PRIMARY_ACTION;
  protected readonly trailingActions = CONCILIACIONES_TRAILING_ACTIONS;

  constructor() {
    this.loadList();
  }

  // ── Handlers del template ─────────────────────────────────────────────────

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
    this.filterStorage.write(CONCILIACIONES_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(CONCILIACIONES_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Conciliacion[]);
  }

  protected onRowClick(row: unknown): void {
    this.navigateTo('detalle', (row as Conciliacion).id);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const conciliacion = event.row as Conciliacion;
    switch (event.actionId) {
      case 'view':
        this.navigateTo('detalle', conciliacion.id);
        break;
      case 'edit':
        this.navigateTo('editar', conciliacion.id);
        break;
      case 'delete':
        this.confirmRemove([conciliacion.id]);
        break;
    }
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

  protected removeSelected(): void {
    const ids = this.selectedRows().map((c) => c.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private confirmRemove(ids: readonly number[]): void {
    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().common.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.remove(ids),
    });
  }

  private remove(ids: readonly number[]): void {
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
        error: () =>
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          ),
      });
  }

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'POST',
        body: {
          filtros: buildFiltros(this.activeFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'conciliaciones.xlsx',
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
    const query: ListQuery = {
      filters: this.activeFilters(),
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

  /** Navega dentro del tenant: `/t/<slug>/contabilidad/utilidades/conciliacion/<...>`. */
  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...CONCILIACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
