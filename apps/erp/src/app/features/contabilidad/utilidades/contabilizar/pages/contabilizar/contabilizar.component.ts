import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import {
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
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
import { ContabilizarService } from '../../contabilizar.service';
import type { ContabilizarRow } from '../../contabilizar.model';
import { DescontabilizarModalComponent } from '../../components/descontabilizar-modal/descontabilizar-modal.component';
import {
  BASE_FILTERS,
  COLUMNS,
  CONTABILIZAR_FILTERS_STORAGE_KEY,
  FILTER_FIELDS,
} from '../../contabilizar.constants';

/**
 * Utilidad **Contabilizar** del módulo Contabilidad.
 *
 * Lista los documentos aprobados que aún no se han contabilizado y permite
 * mandarlos en lote. Sigue el chrome estándar de listas (`<lib-list-shell>`):
 * breadcrumb + card + toolbar (filtros + acciones) + tabla con selección
 * múltiple.
 *
 * Dos acciones, muy distintas entre sí:
 *
 * - **Contabilizar**: sobre los documentos seleccionados. A diferencia de las
 *   utilidades electrónicas, el backend recibe **todos los ids en una sola
 *   petición**, así que no hace falta orquestar un request por documento.
 * - **Descontabilizar**: abre un modal y opera sobre un **rango**, no sobre la
 *   selección. Ver `SUGERENCIAS.md` de esta carpeta.
 */
@Component({
  selector: 'app-contabilizar',
  standalone: true,
  imports: [
    ButtonModule,
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    DescontabilizarModalComponent,
  ],
  templateUrl: './contabilizar.component.html',
  styleUrl: './contabilizar.component.scss',
})
export class ContabilizarComponent {
  private readonly service = inject(ContabilizarService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly ContabilizarRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly ContabilizarRow[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(CONTABILIZAR_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly descontabilizarVisible = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /**
   * Migas: módulo activo (navegable a su home) → esta utilidad. El módulo se
   * deriva del `ActiveModuleStore` (fijado por el `erpModuleResolver` raíz).
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.contabilizar.name },
    ];
  });

  protected readonly canContabilizar = computed(
    () => !this.isProcessing() && this.selectedRows().length > 0,
  );

  protected readonly columns = COLUMNS;
  protected readonly filterFields = FILTER_FIELDS;

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
    this.filterStorage.write(CONTABILIZAR_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(CONTABILIZAR_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as ContabilizarRow[]);
  }

  protected openDescontabilizar(): void {
    this.descontabilizarVisible.set(true);
  }

  protected onContabilizar(): void {
    const ids = this.selectedRows().map((row) => row.id);
    if (ids.length === 0) return;

    const toast = this.t().entities.contabilizar.toasts.contabilizar;
    this.isProcessing.set(true);
    this.service
      .contabilizar(ids)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isProcessing.set(false);
          this.selectedRows.set([]);
          this.loadList();
        }),
      )
      .subscribe({
        next: () => this.toast.success(toast.success.title, toast.success.desc),
        error: () => this.toast.error(toast.error.title, toast.error.desc),
      });
  }

  /** El modal ya notificó el resultado; acá solo se refresca la lista. */
  protected onDescontabilizado(): void {
    this.loadList();
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private loadList(): void {
    const query: ListQuery = {
      filters: this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.isLoading.set(true);
    this.service
      .listar(query, BASE_FILTERS)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results);
          this.totalCount.set(response.count);
          this.selectedRows.set([]);
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
