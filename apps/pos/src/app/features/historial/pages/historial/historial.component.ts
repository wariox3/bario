import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, type Observable } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  FilterStorageService,
  I18nService,
  ToastService,
  alcanceImpresion,
  extractBlobErrorMessage,
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
  type ToolbarAction,
} from '@reddoc/feature-base';
import type { AppDict } from '@pos/i18n';
import { VentaPosService } from '../../../../core/documento/venta-pos.service';
import {
  HISTORIAL_ACCIONES_FILA,
  HISTORIAL_ACCIONES_TOOLBAR,
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
 * El dropdown "Acciones" imprime (un PDF o un ZIP) y exporta a Excel lo que se
 * está viendo. Qué se imprime lo decide `alcanceImpresion`, la misma regla que
 * los listados del ERP: lo marcado, o lo filtrado, o nada.
 *
 * Solo lectura: la ficha completa, anular o emitir a la DIAN se hacen en el ERP.
 */
@Component({
  selector: 'app-historial',
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
  templateUrl: './historial.component.html',
})
export class HistorialComponent {
  private readonly service = inject(HistorialService);
  private readonly ventas = inject(VentaPosService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly VentaHistorial[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>(HISTORIAL_ORDEN_DEFAULT);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(HISTORIAL_FILTROS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);
  protected readonly selectedRows = signal<readonly VentaHistorial[]>([]);
  /** Evita lanzar dos descargas si se clickea repetido antes de terminar. */
  private descargando = false;

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => [
    { label: this.t().layout.nav.historial },
  ]);

  protected readonly columns = HISTORIAL_COLUMNAS;
  protected readonly filterFields = HISTORIAL_CAMPOS_FILTRO;
  protected readonly rowActions = HISTORIAL_ACCIONES_FILA;
  protected readonly toolbarActions: readonly ToolbarAction[] = HISTORIAL_ACCIONES_TOOLBAR;

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
    this.cargar();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort.length > 0 ? sort : HISTORIAL_ORDEN_DEFAULT);
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

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as VentaHistorial[]);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'imprimir-lista':
        this.imprimir((q) => this.service.imprimir(q));
        break;
      case 'imprimir-zip':
        this.imprimir((q) => this.service.imprimirZip(q));
        break;
      case 'export-excel':
        this.descargar(
          this.query(),
          (q) => this.service.exportarExcel(q),
          () => this.t().common.toasts.exportError,
        );
        break;
    }
  }

  /** La búsqueda rápida cuenta como filtro: acota lo que se ve igual que uno. */
  private query(): ListQuery {
    const busqueda = quickSearchCondition(HISTORIAL_BUSQUEDA_CAMPO, this.searchValue());
    return {
      filters: busqueda ? [...this.activeFilters(), busqueda] : this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
    };
  }

  private imprimir(pedir: (query: ListQuery) => Observable<void>): void {
    const tx = this.t().historial;
    const ids = this.selectedRows().map((v) => v.id);
    const alcance = alcanceImpresion(this.query(), ids, this.totalCount());
    if (alcance.tipo === 'sin-criterio') {
      this.toast.warn(tx.toasts.sinCriterio.title, tx.toasts.sinCriterio.desc);
      return;
    }
    if (alcance.tipo === 'vacio') {
      this.toast.warn(tx.toasts.vacio.title, tx.toasts.vacio.desc);
      return;
    }
    const lanzar = () => {
      this.toast.info(tx.toasts.generando.title, tx.toasts.generando.desc);
      this.descargar(alcance.query, pedir, () => tx.toasts.imprimirError);
    };
    if (!alcance.confirmar) {
      lanzar();
      return;
    }
    const c = tx.confirmarImpresion;
    this.confirmation.confirm({
      header: c.header,
      message: c.message.replace('{n}', alcance.cantidad.toLocaleString('es-CO')),
      icon: 'pi pi-print',
      acceptLabel: c.accept,
      rejectLabel: c.reject,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: lanzar,
    });
  }

  private descargar(
    query: ListQuery,
    pedir: (query: ListQuery) => Observable<void>,
    textoError: () => { readonly title: string; readonly desc: string },
  ): void {
    if (this.descargando) return;
    this.descargando = true;
    pedir(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.descargando = false)),
      )
      .subscribe({
        error: (err: unknown) => {
          const tx = textoError();
          void extractBlobErrorMessage(err, tx.desc).then((mensaje) =>
            this.toast.error(tx.title, mensaje),
          );
        },
      });
  }

  protected cargar(): void {
    const query = this.query();
    this.selectedRows.set([]);
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
