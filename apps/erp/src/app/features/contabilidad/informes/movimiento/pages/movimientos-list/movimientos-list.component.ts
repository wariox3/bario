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
import type { Movimiento } from '@erp/core/contabilidad';
import { MOVIMIENTO_INFORME, MovimientoService } from '../../movimiento.service';
import {
  MOVIMIENTO_COLUMNS,
  MOVIMIENTO_FILTER_FIELDS,
  MOVIMIENTO_FILTERS_STORAGE_KEY,
  MOVIMIENTO_TRAILING_ACTIONS,
} from '../../movimiento.constants';

/**
 * Consulta de **movimientos contables** del módulo Contabilidad.
 *
 * El libro: la línea ya contabilizada, con paginación, filtros y descarga de
 * Excel. No tiene crear/editar/eliminar ni ficha — un
 * movimiento lo genera la contabilización de un documento, no se teclea; para
 * verlo en contexto se abre el documento que lo originó.
 *
 * Reusa los building blocks compartidos (`<lib-list-shell>` + `<lib-data-toolbar>`
 * + `<lib-data-table>`), igual que los informes de inventario.
 *
 * **Sin fila de totales**: la tabla pagina, así que sumar la página visible se
 * leería como el total del libro. El ERP anterior tampoco los sumaba.
 */
@Component({
  selector: 'app-movimientos-list',
  standalone: true,
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './movimientos-list.component.html',
  styleUrl: './movimientos-list.component.scss',
})
export class MovimientosListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(MovimientoService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Movimiento[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(MOVIMIENTO_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);
  protected readonly isExportingExcel = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /** Migas: módulo activo (navegable a su home) → consulta actual. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.movimientoContable.name },
    ];
  });

  protected readonly columns = MOVIMIENTO_COLUMNS;
  protected readonly filterFields = MOVIMIENTO_FILTER_FIELDS;
  protected readonly trailingActions = MOVIMIENTO_TRAILING_ACTIONS;

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

  protected openFilters(focusRow: number | null = null): void {
    this.filterFocusRow.set(focusRow);
    this.filtersVisible.set(true);
  }

  /** Quita una sola condición desde su píldora, sin pasar por el modal. */
  protected removeFilter(index: number): void {
    this.onFiltersApply(this.activeFilters().filter((_, i) => i !== index));
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(MOVIMIENTO_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(MOVIMIENTO_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'export-excel':
        this.exportExcel();
        break;
    }
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
          informe: MOVIMIENTO_INFORME,
        },
        fallbackFilename: 'movimientos.xlsx',
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
