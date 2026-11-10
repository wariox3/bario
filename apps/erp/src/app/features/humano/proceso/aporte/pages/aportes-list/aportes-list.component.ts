import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { finalize } from 'rxjs';
import {
  FileDownloadService,
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
  buildFiltros,
  extractErrorMessage,
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
import { AporteService } from '../../aporte.service';
import type { Aporte } from '../../aporte.model';
import {
  APORTES_COLUMNS,
  APORTES_FILTER_FIELDS,
  APORTES_FILTERS_STORAGE_KEY,
  APORTES_PRIMARY_ACTION,
  APORTES_ROW_ACTIONS,
  APORTES_TRAILING_ACTIONS,
  APORTE_LIST_PATH,
  aporteEliminable,
} from '../../aporte.constants';

/**
 * Listado de **aportes a seguridad social**.
 *
 * Filtros, paginación, Excel, abrir un aporte y eliminar. Solo se elimina un
 * aporte en borrador (`aporteEliminable`, que lee `capacidadesDe`): los generados
 * o aprobados no pintan checkbox ni acción de eliminar en su fila.
 */
@Component({
  selector: 'app-aportes-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './aportes-list.component.html',
  styleUrl: './aportes-list.component.scss',
})
export class AportesListComponent {
  private readonly service = inject(AporteService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly Aporte[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(APORTES_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);
  protected readonly isExportingExcel = signal(false);
  protected readonly selectedRows = signal<readonly Aporte[]>([]);
  /** Respaldo del predicado de la tabla: solo cuenta lo que de verdad se puede borrar. */
  protected readonly eliminables = computed(() => this.selectedRows().filter(aporteEliminable));

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      { label: this.t().entities.aporte.name },
    ];
  });

  protected readonly columns = APORTES_COLUMNS;
  protected readonly filterFields = APORTES_FILTER_FIELDS;
  protected readonly rowActions = APORTES_ROW_ACTIONS;
  protected readonly primaryAction = APORTES_PRIMARY_ACTION;
  protected readonly trailingActions = APORTES_TRAILING_ACTIONS;
  protected readonly eliminable = aporteEliminable;

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
    this.filterStorage.write(APORTES_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(APORTES_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Aporte[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const aporte = event.row as Aporte;
    switch (event.actionId) {
      case 'view':
        this.navigateTo('detalle', aporte.id);
        break;
      case 'delete':
        this.confirmRemove([aporte]);
        break;
    }
  }

  protected removeSelected(): void {
    this.confirmRemove(this.eliminables());
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

  // ── Internos ──────────────────────────────────────────────────────────────

  private confirmRemove(aportes: readonly Aporte[]): void {
    if (aportes.length === 0) return;
    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().common.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(aportes.map((a) => a.id)),
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
          this.loadList();
        },
        error: (err: unknown) => {
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            extractErrorMessage(err, this.t().common.toasts.deleteError.desc),
          );
          // Un lote puede haber quedado a medias: recargar muestra qué sobrevivió.
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
          filtros: buildFiltros(this.activeFilters()),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'aportes.xlsx',
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
          this.selectedRows.set([]);
          this.items.set(response.results);
          this.totalCount.set(response.count);
        },
        error: () => {
          this.selectedRows.set([]);
          this.items.set([]);
          this.totalCount.set(0);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }

  /** Navega dentro del tenant: `/t/<slug>/humano/proceso/aporte/<...>`. */
  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...APORTE_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
