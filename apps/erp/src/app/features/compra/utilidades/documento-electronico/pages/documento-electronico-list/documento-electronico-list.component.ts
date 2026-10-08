import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { forkJoin, finalize } from 'rxjs';
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
import { DocumentoElectronicoService } from '../../documento-electronico.service';
import {
  DocumentoElectronicoRow,
  DocumentoElectronicoViewRow,
  resolverEstadoElectronico,
} from '../../documento-electronico.model';
import {
  BASE_FILTERS,
  COLUMNS,
  FILTERS_STORAGE_KEY,
  FILTER_FIELDS,
} from '../../documento-electronico.constants';

/**
 * Utilidad **Documento electrónico** del módulo Compra.
 *
 * Lista de una sola vista (sin tabs, a diferencia de la utilidad de venta):
 * documentos electrónicos de compra aprobados y pendientes de emitir a la DIAN.
 * Sigue el chrome estándar de listas (`<lib-list-shell>`): breadcrumb + card +
 * toolbar (filtros + botón Emitir) + tabla con selección múltiple.
 *
 * La acción **Emitir** dispara un request por documento seleccionado
 * (`forkJoin`) y recarga al terminar. Solo se emiten filas aún no enviadas
 * (`estado_electronico_enviado === false`), como en el legacy.
 */
@Component({
  selector: 'app-documento-electronico-list',
  standalone: true,
  imports: [
    ButtonModule,
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
  ],
  templateUrl: './documento-electronico-list.component.html',
  styleUrl: './documento-electronico-list.component.scss',
})
export class DocumentoElectronicoListComponent {
  private readonly service = inject(DocumentoElectronicoService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ──────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly DocumentoElectronicoViewRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly DocumentoElectronicoViewRow[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

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
      { label: this.t().entities.documentoElectronico.name },
    ];
  });

  /** Seleccionados que aún se pueden emitir (los "esperando respuesta" se excluyen). */
  private readonly emitibles = computed(() =>
    this.selectedRows().filter((row) => !row.estado_electronico_enviado),
  );

  protected readonly canEmitir = computed(
    () => !this.isProcessing() && this.emitibles().length > 0,
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
    this.filterStorage.write(FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as DocumentoElectronicoViewRow[]);
  }

  protected onEmitir(): void {
    const ids = this.emitibles().map((row) => row.id);
    if (ids.length === 0) return;

    const toast = this.t().entities.documentoElectronico.toasts.emitir;
    this.isProcessing.set(true);
    forkJoin(ids.map((id) => this.service.emitir(id)))
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
          this.items.set(response.results.map(toViewRow));
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

/** Enriquece una fila cruda con su estado electrónico derivado. */
function toViewRow(row: DocumentoElectronicoRow): DocumentoElectronicoViewRow {
  return { ...row, estado_electronico_estado: resolverEstadoElectronico(row) };
}
