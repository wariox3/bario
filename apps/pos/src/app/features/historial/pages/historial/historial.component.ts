import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  FilterStorageService,
  I18nService,
  ToastService,
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
import type { AppDict } from '@pos/i18n';
import { VentaPosService } from '../../../../core/documento/venta-pos.service';
import {
  HISTORIAL_ACCIONES_FILA,
  HISTORIAL_BUSQUEDA_CAMPO,
  HISTORIAL_CAMPOS_FILTRO,
  HISTORIAL_COLUMNAS,
  HISTORIAL_FILTROS_STORAGE_KEY,
  HISTORIAL_ORDEN_DEFAULT,
} from '../../historial.constants';
import { HistorialService, type VentaHistorial } from '../../historial.service';

/**
 * Historial de ventas de la caja: las facturas POS (de los dos tipos) del
 * tenant, más recientes primero, con búsqueda por cliente, filtros e imprimir.
 *
 * Solo lectura: la ficha completa, anular o emitir a la DIAN se hacen en el ERP.
 */
@Component({
  selector: 'app-historial',
  standalone: true,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './historial.component.html',
})
export class HistorialComponent {
  private readonly service = inject(HistorialService);
  private readonly ventas = inject(VentaPosService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly VentaHistorial[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>(HISTORIAL_ORDEN_DEFAULT);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(HISTORIAL_FILTROS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => [
    { label: this.t().layout.nav.historial },
  ]);

  protected readonly columns = HISTORIAL_COLUMNAS;
  protected readonly filterFields = HISTORIAL_CAMPOS_FILTRO;
  protected readonly rowActions = HISTORIAL_ACCIONES_FILA;

  constructor() {
    this.cargar();
  }

  protected onSearch(valor: string): void {
    this.searchValue.set(valor);
    this.currentPage.set(0);
    this.cargar();
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.cargar();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort.length > 0 ? sort : HISTORIAL_ORDEN_DEFAULT);
    this.currentPage.set(0);
    this.cargar();
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(HISTORIAL_FILTROS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.cargar();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(HISTORIAL_FILTROS_STORAGE_KEY);
    this.currentPage.set(0);
    this.cargar();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'imprimir') return;
    const venta = event.row as VentaHistorial;
    this.ventas
      .imprimir(venta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          const tx = this.t().historial.toasts.imprimirError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }

  protected cargar(): void {
    const busqueda = quickSearchCondition(HISTORIAL_BUSQUEDA_CAMPO, this.searchValue());
    const query: ListQuery = {
      filters: busqueda ? [...this.activeFilters(), busqueda] : this.activeFilters(),
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
}
