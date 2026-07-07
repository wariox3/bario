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
import { ActiveModuleStore } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ResolucionService } from '../../resolucion.service';
import type { Resolucion, ResolucionTipo } from '../../resolucion.model';
import {
  RESOLUCIONES_COLUMNS,
  RESOLUCIONES_FILTER_FIELDS,
  RESOLUCIONES_QUICK_SEARCH_FIELD,
  RESOLUCIONES_PRIMARY_ACTION,
  RESOLUCIONES_ROW_ACTIONS,
  RESOLUCIONES_TRAILING_ACTIONS,
  resolucionTipoFilter,
  resolucionesFiltersStorageKey,
} from '../../resolucion.constants';

@Component({
  selector: 'app-resoluciones-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './resoluciones-list.component.html',
  styleUrl: './resoluciones-list.component.scss',
})
export class ResolucionesListComponent {
  private readonly service = inject(ResolucionService);
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

  /** Módulo activo (venta/compra) del que cuelga este listado. */
  protected readonly tipo = computed<ResolucionTipo>(() =>
    this.activeModule.activeId() === 'compra' ? 'compra' : 'venta',
  );

  private readonly storageKey = resolucionesFiltersStorageKey(this.tipo());

  protected readonly items = signal<readonly Resolucion[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Resolucion[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(this.storageKey),
  );
  protected readonly filtersVisible = signal(false);

  protected readonly isExportingExcel = signal(false);

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const tipo = this.tipo();
    const moduleName =
      tipo === 'compra' ? this.t().modules.compra.name : this.t().modules.venta.name;
    return [
      { label: moduleName, routerLink: slug ? ['/t', slug, tipo] : undefined },
      { label: this.t().entities.resolucion.name },
    ];
  });

  protected readonly columns = RESOLUCIONES_COLUMNS;
  protected readonly filterFields = RESOLUCIONES_FILTER_FIELDS;
  protected readonly rowActions = RESOLUCIONES_ROW_ACTIONS;
  protected readonly primaryAction = RESOLUCIONES_PRIMARY_ACTION;
  protected readonly trailingActions = RESOLUCIONES_TRAILING_ACTIONS;

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
    this.filterStorage.write(this.storageKey, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(this.storageKey);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Resolucion[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const resolucion = event.row as Resolucion;
    switch (event.actionId) {
      case 'view':
        this.navigateTo('detalle', resolucion.id);
        break;
      case 'edit':
        this.navigateTo('editar', resolucion.id);
        break;
      case 'delete':
        this.confirmRemove([resolucion.id]);
        break;
    }
  }

  protected onRowClick(row: unknown): void {
    this.navigateTo('detalle', (row as Resolucion).id);
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
    const ids = this.selectedRows().map((r) => r.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download('/general/resolucion/excel/', {
        method: 'POST',
        body: {
          // Mantiene el filtro fijo del módulo (venta/compra) que aplica el listado.
          filtros: buildFiltros([resolucionTipoFilter(this.tipo()), ...this.activeFilters()]),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'resoluciones.xlsx',
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
    const search = quickSearchCondition(RESOLUCIONES_QUICK_SEARCH_FIELD, this.searchValue());
    // Filtro fijo del módulo (venta/compra) + filtros del usuario + búsqueda rápida.
    const filters: FilterCondition[] = [resolucionTipoFilter(this.tipo()), ...this.activeFilters()];
    if (search) filters.push(search);

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
    void this.router.navigate(['/t', slug, this.tipo(), 'resoluciones', ...subPath]);
  }
}
