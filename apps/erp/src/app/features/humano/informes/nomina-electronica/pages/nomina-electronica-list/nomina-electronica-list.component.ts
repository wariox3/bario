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
import type { AppDict } from '@erp/i18n';
import {
  NominaElectronicaInformeService,
  NOMINA_ELECTRONICA_INFORME_EXPORT_SERIALIZADOR,
} from '../../nomina-electronica.service';
import type { NominaElectronicaInforme } from '../../nomina-electronica.model';
import {
  NOMINA_ELECTRONICA_INFORME_COLUMNS,
  NOMINA_ELECTRONICA_INFORME_FILTER_FIELDS,
  NOMINA_ELECTRONICA_INFORME_FILTERS_STORAGE_KEY,
  NOMINA_ELECTRONICA_INFORME_TRAILING_ACTIONS,
} from '../../nomina-electronica.constants';

/**
 * Informe **Nómina electrónica** del módulo Humano.
 *
 * Lista de solo lectura sobre los documentos de clase nómina electrónica: una
 * fila por nómina emitida, con su liquidación resumida y el estado del envío a
 * la DIAN. Ofrece paginación, filtros y descarga de Excel; no tiene
 * crear/editar/eliminar ni selección múltiple.
 */
@Component({
  selector: 'app-nomina-electronica-list',
  standalone: true,
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './nomina-electronica-list.component.html',
  styleUrl: './nomina-electronica-list.component.scss',
})
export class NominaElectronicaListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(NominaElectronicaInformeService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly NominaElectronicaInforme[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(NOMINA_ELECTRONICA_INFORME_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly isExportingExcel = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /**
   * Migas: módulo activo (navegable a su home) → informe actual.
   * El módulo se deriva del `ActiveModuleStore` (informe montable desde varios).
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.nominaElectronicaInforme.name },
    ];
  });

  protected readonly columns = NOMINA_ELECTRONICA_INFORME_COLUMNS;
  protected readonly filterFields = NOMINA_ELECTRONICA_INFORME_FILTER_FIELDS;
  protected readonly trailingActions = NOMINA_ELECTRONICA_INFORME_TRAILING_ACTIONS;

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
    this.filterStorage.write(NOMINA_ELECTRONICA_INFORME_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(NOMINA_ELECTRONICA_INFORME_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'export-excel') this.exportExcel();
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'POST',
        body: {
          // El filtro de clase va también en la descarga: si no, el Excel
          // traería documentos que no son nómina electrónica.
          filtros: buildFiltros([...this.service.baseFilters, ...this.activeFilters()]),
          ordenamientos: buildOrdenamientos(this.sort()),
          serializador: NOMINA_ELECTRONICA_INFORME_EXPORT_SERIALIZADOR,
        },
        fallbackFilename: 'nomina-electronica.xlsx',
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
