import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { LiquidacionService } from '../../liquidacion.service';
import type { Liquidacion } from '../../liquidacion.model';
import {
  LIQUIDACIONES_COLUMNS,
  LIQUIDACIONES_FILTERS_STORAGE_KEY,
  LIQUIDACIONES_FILTER_FIELDS,
  LIQUIDACIONES_ROW_ACTIONS,
  LIQUIDACIONES_TRAILING_ACTIONS,
  LIQUIDACION_LIST_PATH,
} from '../../liquidacion.constants';

/**
 * Listado de **liquidaciones**.
 *
 * Solo consulta y navegación: filtros, paginación, Excel y abrir una liquidación.
 *
 * **Sin "Nuevo" y sin editar**, a diferencia de los demás listados del ERP: una
 * liquidación no se crea ni se corrige desde acá — la fabrica el backend al
 * terminar un contrato, y sus números los calcula él. El borrado depende del
 * estado (solo borrador) y vive en el workspace.
 */
@Component({
  selector: 'app-liquidaciones-list',
  standalone: true,
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './liquidaciones-list.component.html',
  styleUrl: './liquidaciones-list.component.scss',
})
export class LiquidacionesListComponent {
  private readonly service = inject(LiquidacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly Liquidacion[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(LIQUIDACIONES_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly isExportingExcel = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      { label: this.t().entities.liquidacion.name },
    ];
  });

  protected readonly columns = LIQUIDACIONES_COLUMNS;
  protected readonly filterFields = LIQUIDACIONES_FILTER_FIELDS;
  protected readonly rowActions = LIQUIDACIONES_ROW_ACTIONS;
  protected readonly trailingActions = LIQUIDACIONES_TRAILING_ACTIONS;

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
    this.filterStorage.write(LIQUIDACIONES_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(LIQUIDACIONES_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onRowClick(row: unknown): void {
    this.navigateTo('detalle', (row as Liquidacion).id);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId === 'view') this.navigateTo('detalle', (event.row as Liquidacion).id);
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
        },
        fallbackFilename: 'liquidaciones.xlsx',
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

  /** Navega dentro del tenant: `/t/<slug>/humano/proceso/liquidacion/<...>`. */
  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...LIQUIDACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
