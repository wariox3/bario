import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
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
} from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ExistenciaService, EXISTENCIA_SERIALIZADOR } from '../../existencia.service';
import type { Existencia } from '../../existencia.model';
import {
  EXISTENCIA_COLUMNS,
  EXISTENCIA_FILTER_FIELDS,
  EXISTENCIA_FILTERS_STORAGE_KEY,
  EXISTENCIA_TRAILING_ACTIONS,
} from '../../existencia.constants';

/**
 * Informe **Existencias** del módulo Inventario.
 *
 * Lista de solo lectura sobre el master de ítems, acotada a los que manejan
 * inventario: paginación, filtros y descarga de Excel. No tiene
 * crear/editar/eliminar ni selección múltiple (camino B recortado a un
 * informe). Reusa los building blocks compartidos (`<lib-data-toolbar>` +
 * `<lib-data-table>`).
 */
@Component({
  selector: 'app-existencia-list',
  standalone: true,
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './existencia-list.component.html',
  styleUrl: './existencia-list.component.scss',
})
export class ExistenciaListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(ExistenciaService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Existencia[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(EXISTENCIA_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly isExportingExcel = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /**
   * Migas: módulo activo (navegable a su home) → informe actual.
   * El módulo se deriva del `ActiveModuleStore` (informe montable desde varios).
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.existencia.name },
    ];
  });

  protected readonly columns = EXISTENCIA_COLUMNS;
  protected readonly filterFields = EXISTENCIA_FILTER_FIELDS;
  protected readonly trailingActions = EXISTENCIA_TRAILING_ACTIONS;

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
    this.filterStorage.write(EXISTENCIA_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(EXISTENCIA_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'export-excel') this.exportExcel();
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'POST',
        body: {
          // Los filtros implícitos van también en la descarga: si no, el Excel
          // traería ítems que la tabla nunca mostró.
          filtros: buildFiltros([...this.service.baseFilters, ...this.activeFilters()]),
          ordenamientos: buildOrdenamientos(this.sort()),
          serializador: EXISTENCIA_SERIALIZADOR,
        },
        fallbackFilename: 'existencias.xlsx',
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
}
