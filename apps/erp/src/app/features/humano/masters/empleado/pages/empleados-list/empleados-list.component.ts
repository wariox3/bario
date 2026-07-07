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
import { ContactoService } from '@erp/features/general/masters/contacto/contacto.service';
import type { Empleado } from '../../empleado.model';
import {
  EMPLEADOS_COLUMNS,
  EMPLEADOS_FILTER_FIELDS,
  EMPLEADOS_FILTERS_STORAGE_KEY,
  EMPLEADOS_PRIMARY_ACTION,
  EMPLEADOS_QUICK_SEARCH_FIELD,
  EMPLEADOS_ROW_ACTIONS,
  EMPLEADOS_TRAILING_ACTIONS,
  EMPLEADO_BASE_FILTER,
  EMPLEADO_LIST_PATH,
} from '../../empleado.constants';

/**
 * Listado de empleados.
 *
 * Master del módulo Humano. Empleado = contacto con `empleado=true`, así que
 * reutiliza `ContactoService` y siempre antepone `EMPLEADO_BASE_FILTER` para
 * acotar el listado a empleados. Navegación module-fija a `humano`.
 */
@Component({
  selector: 'app-empleados-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './empleados-list.component.html',
  styleUrl: './empleados-list.component.scss',
})
export class EmpleadosListComponent {
  private readonly service = inject(ContactoService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly Empleado[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Empleado[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(EMPLEADOS_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly isExportingExcel = signal(false);

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      { label: this.t().entities.empleado.name },
    ];
  });

  protected readonly columns = EMPLEADOS_COLUMNS;
  protected readonly filterFields = EMPLEADOS_FILTER_FIELDS;
  protected readonly rowActions = EMPLEADOS_ROW_ACTIONS;
  protected readonly primaryAction = EMPLEADOS_PRIMARY_ACTION;
  protected readonly trailingActions = EMPLEADOS_TRAILING_ACTIONS;

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
    this.filterStorage.write(EMPLEADOS_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(EMPLEADOS_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Empleado[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const empleado = event.row as Empleado;
    switch (event.actionId) {
      case 'view':
        this.navigateTo('detalle', empleado.id);
        break;
      case 'edit':
        this.navigateTo('editar', empleado.id);
        break;
      case 'delete':
        this.confirmRemove([empleado.id]);
        break;
    }
  }

  protected onRowClick(row: unknown): void {
    this.navigateTo('detalle', (row as Empleado).id);
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
    const ids = this.selectedRows().map((e) => e.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  /** Filtros efectivos: base empleado=true + filtros activos + búsqueda rápida. */
  private effectiveFilters(): readonly FilterCondition[] {
    const search = quickSearchCondition(EMPLEADOS_QUICK_SEARCH_FIELD, this.searchValue());
    const base = [EMPLEADO_BASE_FILTER, ...this.activeFilters()];
    return search ? [...base, search] : base;
  }

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download('/general/contacto/excel/', {
        method: 'POST',
        body: {
          filtros: buildFiltros(this.effectiveFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'empleados.xlsx',
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
      filters: this.effectiveFilters(),
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
    void this.router.navigate(['/t', slug, 'humano', ...EMPLEADO_LIST_PATH, ...subPath]);
  }
}
