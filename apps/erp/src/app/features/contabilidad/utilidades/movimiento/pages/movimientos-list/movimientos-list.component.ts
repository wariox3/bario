import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { finalize, type Observable } from 'rxjs';
import {
  FileDownloadService,
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
  buildFiltros,
  buildOrdenamientos,
  extractErrorMessage,
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
import type { Movimiento } from '@erp/core/contabilidad';
import {
  MOVIMIENTO_COLUMNS,
  MOVIMIENTO_FILTER_FIELDS,
} from '../../../../informes/movimiento/movimiento.constants';
import { MovimientoUtilidadService } from '../../movimiento.service';
import {
  MOVIMIENTO_UTILIDAD_BASE_FILTERS,
  MOVIMIENTO_UTILIDAD_FILTERS_STORAGE_KEY,
  MOVIMIENTO_UTILIDAD_IMPORT_MASTERS,
  MOVIMIENTO_UTILIDAD_TRAILING_ACTIONS,
} from '../../movimiento.constants';

/**
 * Utilidad **Movimientos** del módulo Contabilidad: los movimientos de saldo
 * inicial.
 *
 * Muestra lo mismo que el informe de movimientos (mismas columnas y filtros),
 * pero contra `/contabilidad/movimiento/` y siempre con `saldo_inicial = true`
 * —un filtro permanente que la persona no ve ni puede quitar—. Suma la
 * importación desde Excel, que es por donde entran estos saldos, y el borrado:
 * de lo seleccionado (`eliminar/`) o de todo lo que cumpla los filtros
 * (`eliminar-masivo/`).
 *
 * **Sin fila de totales**: la tabla pagina, así que sumar la página visible se
 * leería como el total.
 */
@Component({
  selector: 'app-movimientos-utilidad-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ImportDialogComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './movimientos-list.component.html',
  styleUrl: './movimientos-list.component.scss',
})
export class MovimientosUtilidadListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(MovimientoUtilidadService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
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
    this.filterStorage.read(MOVIMIENTO_UTILIDAD_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);
  protected readonly isExportingExcel = signal(false);
  protected readonly selectedRows = signal<readonly Movimiento[]>([]);

  // ── Importación ───────────────────────────────────────────────────────────
  /** Vuelve a la primera página al terminar: lo importado desplaza lo que se veía. */
  protected readonly importar = importState({
    upload: (file) => this.service.importar(file),
    onImported: () => {
      this.currentPage.set(0);
      this.loadList();
    },
    masters: MOVIMIENTO_UTILIDAD_IMPORT_MASTERS,
  });

  /** Plantilla de ejemplo de la importación. */
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
  protected readonly trailingActions = MOVIMIENTO_UTILIDAD_TRAILING_ACTIONS;

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
    this.filterStorage.write(MOVIMIENTO_UTILIDAD_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(MOVIMIENTO_UTILIDAD_FILTERS_STORAGE_KEY);
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
      case 'delete-by-filters':
        this.confirmRemoveByFilters();
        break;
    }
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Movimiento[]);
  }

  protected removeSelected(): void {
    const ids = this.selectedRows().map((m) => m.id);
    if (ids.length === 0) return;
    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().common.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(this.service.eliminar(ids)),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Confirma el borrado por filtros mostrando cuántos movimientos abarca: el
   * total del listado, no la página visible. Con el listado vacío no hay nada
   * que borrar y no se pregunta.
   */
  private confirmRemoveByFilters(): void {
    const total = this.totalCount();
    if (total === 0) return;
    const dict = this.t().entities.movimientoContable.deleteByFilters;
    this.confirmation.confirm({
      header: dict.header,
      message: dict.message.replace('{total}', String(total)),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(this.service.eliminarMasivo(this.activeFilters())),
    });
  }

  private executeRemove(request: Observable<unknown>): void {
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(
          this.t().common.toasts.deleteSuccess.title,
          this.t().common.toasts.deleteSuccess.desc,
        );
        this.selectedRows.set([]);
        this.currentPage.set(0);
        this.loadList();
      },
      error: (err: unknown) => {
        this.toast.error(
          this.t().common.toasts.deleteError.title,
          extractErrorMessage(err, this.t().common.toasts.deleteError.desc),
        );
        this.loadList();
      },
    });
  }

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'POST',
        body: {
          filtros: buildFiltros([...MOVIMIENTO_UTILIDAD_BASE_FILTERS, ...this.activeFilters()]),
          ordenamientos: buildOrdenamientos(this.sort()),
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
