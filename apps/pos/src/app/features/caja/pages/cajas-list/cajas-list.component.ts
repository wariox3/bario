import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  FilterStorageService,
  I18nService,
  ToastService,
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
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@pos/i18n';
import {
  CAJAS_ACCIONES_FILA,
  CAJAS_ACCION_PRIMARIA,
  CAJAS_ACCIONES_TOOLBAR,
  CAJAS_CAMPOS_FILTRO,
  CAJAS_COLUMNAS,
  CAJAS_FILTROS_STORAGE_KEY,
} from '../../caja.constants';
import type { Caja } from '../../caja.model';
import { cajaNav } from '../../caja.nav';
import { CajaService } from '../../caja.service';

/**
 * Listado de las cajas del tenant, con filtros, Excel, alta, edición, ficha y
 * eliminar. Compone los building blocks compartidos dentro del `<lib-list-shell>`.
 */
@Component({
  selector: 'app-cajas-list',
  standalone: true,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './cajas-list.component.html',
})
export class CajasListComponent {
  private readonly service = inject(CajaService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly nav = cajaNav();

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly Caja[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(CAJAS_FILTROS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);
  protected readonly selectedRows = signal<readonly Caja[]>([]);
  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);
  private readonly exportando = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    this.nav.crumbs(this.t().layout.nav.caja),
  );

  protected readonly columns = CAJAS_COLUMNAS;
  protected readonly filterFields = CAJAS_CAMPOS_FILTRO;
  protected readonly rowActions = CAJAS_ACCIONES_FILA;
  protected readonly primaryAction = CAJAS_ACCION_PRIMARIA;
  protected readonly toolbarActions = CAJAS_ACCIONES_TOOLBAR;

  constructor() {
    this.cargar();
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.cargar();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort);
    this.currentPage.set(0);
    this.cargar();
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
    this.filterStorage.write(CAJAS_FILTROS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.cargar();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(CAJAS_FILTROS_STORAGE_KEY);
    this.currentPage.set(0);
    this.cargar();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Caja[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const caja = event.row as Caja;
    switch (event.actionId) {
      case 'view':
        this.nav.ir('detalle', caja.id);
        break;
      case 'edit':
        this.nav.ir('editar', caja.id);
        break;
      case 'delete':
        this.confirmarEliminar([caja.id]);
        break;
    }
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'new':
        this.nav.ir('nuevo');
        break;
      case 'export-excel':
        this.exportarExcel();
        break;
    }
  }

  protected eliminarSeleccionadas(): void {
    const ids = this.selectedRows().map((c) => c.id);
    if (ids.length > 0) this.confirmarEliminar(ids);
  }

  private query(): ListQuery {
    return {
      filters: this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
    };
  }

  private exportarExcel(): void {
    if (this.exportando()) return;
    this.exportando.set(true);
    this.service
      .exportarExcel(this.query())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exportando.set(false)),
      )
      .subscribe({
        error: () => {
          const tx = this.t().common.toasts.exportError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }

  private cargar(): void {
    this.selectedRows.set([]);
    this.isLoading.set(true);
    this.service
      .list(this.query())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.items.set(respuesta.results);
          this.totalCount.set(respuesta.count);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          const tx = this.t().common.toasts.loadError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }

  private confirmarEliminar(ids: readonly number[]): void {
    const c = this.t().common;
    this.confirmation.confirm({
      header: c.confirms.deleteHeader,
      message: c.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: c.actions.delete,
      rejectLabel: c.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.eliminar(ids),
    });
  }

  private eliminar(ids: readonly number[]): void {
    this.service
      .remove(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const tx = this.t().common.toasts.deleteSuccess;
          this.toast.success(tx.title, tx.desc);
          this.cargar();
        },
        error: (err: unknown) => {
          const tx = this.t().common.toasts.deleteError;
          this.toast.error(tx.title, extractErrorMessage(err, tx.desc));
        },
      });
  }
}
