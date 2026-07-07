import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';
import {
  FilterStorageService,
  I18nService,
  TenantService,
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
import type { AppDict } from '@turnos/i18n';
import { ENTITY_DATA_GATEWAY } from '@reddoc/core';
import type { Programacion } from '../../programacion.model';
import {
  PROGRAMACIONES_COLUMNS,
  PROGRAMACIONES_FILTER_FIELDS,
  PROGRAMACIONES_FILTERS_STORAGE_KEY,
  PROGRAMACIONES_QUICK_SEARCH_FIELD,
  PROGRAMACIONES_ROW_ACTIONS,
  PROGRAMACION_DOCUMENT_CONFIG,
} from '../../programacion.constants';

/**
 * Listado de programaciones.
 *
 * Movimiento del módulo Turno (sección Movimientos, `features/turno/`).
 *
 * Es una **vista recortada de los documentos de pedido servicio** (tipo 35).
 * Mantiene su propio shell (camino B: `<lib-data-toolbar>` + `<lib-data-table>`),
 * pero la data la trae el `ENTITY_DATA_GATEWAY` del framework de documentos
 * (camino A) manejado por `PROGRAMACION_DOCUMENT_CONFIG`, en vez de un endpoint
 * propio: así no se reimplementa `general/documento/lista/` ni la inyección del
 * `documento_tipo_id`.
 *
 * Solo expone ver detalle y eliminar (sin crear/editar/exportar).
 */
@Component({
  selector: 'app-programaciones-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './programaciones-list.component.html',
  styleUrl: './programaciones-list.component.scss',
})
export class ProgramacionesListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Config que conduce el gateway de documentos (pedido servicio, tipo 35). */
  private readonly documentConfig = PROGRAMACION_DOCUMENT_CONFIG;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Programacion[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Programacion[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(PROGRAMACIONES_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────
  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /**
   * Migas: módulo (Turno, navegable a su home) → entidad actual (Programación).
   * La programación es un movimiento del módulo `turno`, por eso el segmento es
   * fijo.
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      { label: this.t().entities.programacion.name },
    ];
  });

  protected readonly columns = PROGRAMACIONES_COLUMNS;
  protected readonly filterFields = PROGRAMACIONES_FILTER_FIELDS;
  protected readonly rowActions = PROGRAMACIONES_ROW_ACTIONS;

  constructor() {
    this.loadList();
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadList();
  }

  /**
   * Ordenamiento multi-columna emitido por los headers de la tabla. Vuelve a
   * la primera página porque el orden cambia el conjunto visible.
   */
  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort);
    this.currentPage.set(0);
    this.loadList();
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  /**
   * Filtros confirmados desde el modal. Se persisten en localStorage para que
   * sobrevivan a recargas hasta que el usuario los limpie.
   */
  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(PROGRAMACIONES_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(PROGRAMACIONES_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Programacion[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const programacion = event.row as Programacion;
    switch (event.actionId) {
      case 'view':
        this.navigateToDetail(programacion.id);
        break;
      case 'delete':
        this.confirmRemove([programacion.id]);
        break;
    }
  }

  protected removeSelected(): void {
    const ids = this.selectedRows().map((p) => p.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Navega al detalle de la programación.
   *
   * TODO: la ruta/página de detalle está pendiente (usará el endpoint
   * `/turno/programacion/detalle/?documento=…` vía `ProgramacionService`).
   */
  private navigateToDetail(id: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    this.router.navigate(['/t', slug, 'programaciones', 'detalle', id]);
  }

  private loadList(): void {
    // La búsqueda rápida se añade como un filtro `contiene` más, combinado (AND)
    // con los filtros avanzados activos.
    const search = quickSearchCondition(PROGRAMACIONES_QUICK_SEARCH_FIELD, this.searchValue());
    const filters = search ? [...this.activeFilters(), search] : this.activeFilters();

    const query: ListQuery = {
      filters,
      sort: this.sort(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.isLoading.set(true);
    this.gateway
      .list(this.documentConfig, query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results as readonly Programacion[]);
          this.totalCount.set(response.totalCount);
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

  private confirmRemove(ids: readonly number[]): void {
    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().common.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(ids),
    });
  }

  private executeRemove(ids: readonly number[]): void {
    this.gateway
      .remove(this.documentConfig, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(
            this.t().common.toasts.deleteSuccess.title,
            this.t().common.toasts.deleteSuccess.desc,
          );
          this.selectedRows.set([]);
          this.loadList();
        },
        error: () => {
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          );
        },
      });
  }
}
