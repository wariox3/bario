import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { HttpErrorResponse } from '@angular/common/http';
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
import { parseImportErrors } from '@erp/core/components/import-dialog/import-dialog.utils';
import type {
  ExampleConfig,
  ImportError,
} from '@erp/core/components/import-dialog/import-dialog.types';
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
  protected readonly importVisible = signal(false);
  protected readonly importLoading = signal(false);
  protected readonly importErrors = signal<readonly ImportError[]>([]);
  protected readonly importErrorSummary = signal('');
  protected readonly importErrorTotal = signal(0);

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

  /** Archivos de referencia del diálogo de importación (tab "Maestros"). */
  protected readonly importMasters = MOVIMIENTO_IMPORT_MASTERS;

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
        // Abre siempre limpio: descarta el resultado del intento anterior.
        this.clearImportErrors();
        this.importVisible.set(true);
        break;
      case 'export-excel':
        this.exportExcel();
        break;
    }
  }

  protected onImportVisibleChange(value: boolean): void {
    this.importVisible.set(value);
  }

  protected onImportRequested(file: File): void {
    if (this.importLoading()) return;
    this.importLoading.set(true);
    this.clearImportErrors();
    this.service
      .importar(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importLoading.set(false)),
      )
      .subscribe({
        next: (result) => {
          // El backend puede reportar los errores de validación en un 200; si los
          // trae, se muestran en vez de tratarlo como éxito.
          if (this.applyImportErrors(parseImportErrors(result))) return;
          const toasts = this.t().common.import.toasts;
          this.toast.success(toasts.success.title, toasts.success.desc);
          this.importVisible.set(false);
          this.clearImportErrors();
          this.currentPage.set(0);
          this.loadList();
        },
        error: (err: HttpErrorResponse) => {
          if (!this.applyImportErrors(parseImportErrors(err.error))) {
            const toasts = this.t().common.import.toasts;
            this.toast.error(toasts.error.title, toasts.error.desc);
          }
        },
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Vuelca los errores parseados en los signals del diálogo. Devuelve `true` si
   * había errores/resumen (para que el llamador no siga el camino de éxito).
   */
  private applyImportErrors(parsed: ReturnType<typeof parseImportErrors>): boolean {
    if (parsed.errors.length === 0 && !parsed.summary) return false;
    this.importErrors.set(parsed.errors);
    this.importErrorSummary.set(parsed.summary);
    this.importErrorTotal.set(parsed.total);
    return true;
  }

  private clearImportErrors(): void {
    this.importErrors.set([]);
    this.importErrorSummary.set('');
    this.importErrorTotal.set(0);
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
