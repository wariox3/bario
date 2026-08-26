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
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import type { ExampleConfig } from '@erp/core/components/import-dialog/import-dialog.types';
import type { AppDict } from '@erp/i18n';
import { MovimientoService, MOVIMIENTO_SERIALIZADOR } from '../../movimiento.service';
import type { Movimiento } from '../../movimiento.model';
import {
  MOVIMIENTO_COLUMNS,
  MOVIMIENTO_FILTER_FIELDS,
  MOVIMIENTO_FILTERS_STORAGE_KEY,
  MOVIMIENTO_IMPORT_MASTERS,
  MOVIMIENTO_TRAILING_ACTIONS,
} from '../../movimiento.constants';

/**
 * Consulta de **movimientos contables** del módulo Contabilidad.
 *
 * El libro: la línea ya contabilizada, con paginación, filtros, importación
 * masiva y descarga de Excel. No tiene crear/editar/eliminar ni ficha — un
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
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ImportDialogComponent,
  ],
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
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(MOVIMIENTO_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly isExportingExcel = signal(false);

  // ── Importación ───────────────────────────────────────────────────────────
  /**
   * Estado del diálogo de importación. Vuelve a la primera página al terminar:
   * las líneas importadas entran al libro y desplazan lo que se estaba viendo.
   */
  protected readonly importar = importState({
    upload: (file) => this.service.importar(file),
    onImported: () => {
      this.currentPage.set(0);
      this.loadList();
    },
    masters: MOVIMIENTO_IMPORT_MASTERS,
  });

  /** Plantilla de ejemplo de la importación (endpoint supuesto — ver servicio). */
  protected readonly exampleConfig: ExampleConfig = {
    mode: 'enabled',
    endpoint: this.service.exampleUrl,
  };

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
      case 'import':
        this.importar.open();
        break;
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
          serializador: MOVIMIENTO_SERIALIZADOR,
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
