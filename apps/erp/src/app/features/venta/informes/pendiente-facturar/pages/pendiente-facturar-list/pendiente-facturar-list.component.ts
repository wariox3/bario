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
import type { AppDict } from '@erp/i18n';
import {
  PendienteFacturarService,
  PENDIENTE_FACTURAR_INFORME,
} from '../../pendiente-facturar.service';
import type { PendienteFacturar } from '../../pendiente-facturar.model';
import {
  PENDIENTE_FACTURAR_COLUMNS,
  PENDIENTE_FACTURAR_FILTER_FIELDS,
  PENDIENTE_FACTURAR_FILTERS_STORAGE_KEY,
  PENDIENTE_FACTURAR_TRAILING_ACTIONS,
} from '../../pendiente-facturar.constants';

/**
 * Informe **Pendiente por facturar** del módulo Venta.
 *
 * Lista de solo lectura sobre `documento-detalle`: paginación, filtros,
 * búsqueda rápida y descarga de Excel. No tiene crear/editar/eliminar ni
 * selección múltiple (camino B recortado a un informe). Reusa los building
 * blocks compartidos (`<lib-data-toolbar>` + `<lib-data-table>`).
 */
@Component({
  selector: 'app-pendiente-facturar-list',
  standalone: true,
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './pendiente-facturar-list.component.html',
  styleUrl: './pendiente-facturar-list.component.scss',
})
export class PendienteFacturarListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(PendienteFacturarService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly PendienteFacturar[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(PENDIENTE_FACTURAR_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly isExportingExcel = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /** Migas: módulo (Venta, navegable a su home) → informe actual. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.venta.name,
        routerLink: slug ? ['/t', slug, 'venta'] : undefined,
      },
      { label: this.t().entities.pendienteFacturar.name },
    ];
  });

  protected readonly columns = PENDIENTE_FACTURAR_COLUMNS;
  protected readonly filterFields = PENDIENTE_FACTURAR_FILTER_FIELDS;
  protected readonly trailingActions = PENDIENTE_FACTURAR_TRAILING_ACTIONS;

  constructor() {
    this.loadList();
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
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
    this.filterStorage.write(PENDIENTE_FACTURAR_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(PENDIENTE_FACTURAR_FILTERS_STORAGE_KEY);
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
          filtros: buildFiltros(this.activeFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
          informe: PENDIENTE_FACTURAR_INFORME,
        },
        fallbackFilename: 'pendiente-facturar.xlsx',
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
