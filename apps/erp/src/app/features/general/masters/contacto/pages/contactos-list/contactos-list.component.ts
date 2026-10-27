import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';
import {
  FileDownloadService,
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
  buildFiltros,
  buildOrdenamientos,
  quickSearchCondition,
  type FilterCondition,
  type ListQuery,
  type SortSpec,
  extractErrorMessage,
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
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import { MODELO, masterActions } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '../../contacto.service';
import type { Contacto } from '../../contacto.model';
import {
  CONTACTOS_COLUMNS,
  CONTACTOS_FILTER_FIELDS,
  CONTACTOS_QUICK_SEARCH_FIELD,
  CONTACTOS_IMPORT_MASTERS,
  CONTACTOS_PRIMARY_ACTION,
  CONTACTOS_ROW_ACTIONS,
  CONTACTOS_TRAILING_ACTIONS,
  contactoRolDelModulo,
  contactoRolFilter,
  contactosFiltersStorageKey,
} from '../../contacto.constants';

/**
 * Listado de contactos.
 *
 * Master administrativo del módulo General (`features/general/`):
 * cubre clientes, proveedores y empleados sobre el mismo recurso. En Venta
 * solo lista clientes y en Compra solo proveedores (`contactoRolDelModulo`).
 *
 * Camino B del enfoque híbrido: feature directo que compone los building
 * blocks compartidos (`<lib-data-toolbar>` + `<lib-data-table>`) dentro de
 * un wrapper `.card`. No usa `EntityConfig` del framework configuracional.
 */
@Component({
  selector: 'app-contactos-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
    ImportDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './contactos-list.component.html',
  styleUrl: './contactos-list.component.scss',
})
export class ContactosListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(ContactoService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Rol que fija el módulo activo (Venta → cliente, Compra → proveedor). */
  private readonly rol = contactoRolDelModulo(this.activeModule.activeId());
  private readonly storageKey = contactosFiltersStorageKey(this.rol);

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Contacto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly Contacto[]>([]);
  protected readonly searchValue = signal('');
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(this.storageKey),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);

  protected readonly exampleConfig = {
    mode: 'enabled' as const,
    endpoint: '/general/contacto/importar-ejemplo/',
  };

  protected readonly isExportingExcel = signal(false);

  /** Estado del diálogo de importación (visibilidad, progreso, errores, maestros). */
  protected readonly importar = importState({
    upload: (file) => this.service.importar(file),
    onImported: () => this.loadList(),
    masters: CONTACTOS_IMPORT_MASTERS,
  });

  // ── Derivados ─────────────────────────────────────────────────────────────
  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /**
   * Migas: módulo activo (navegable a su home) → entidad actual (Contactos).
   * El módulo se deriva del `ActiveModuleStore` (master compartido entre módulos).
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.contacto.name },
    ];
  });

  protected readonly columns = CONTACTOS_COLUMNS;
  protected readonly filterFields = CONTACTOS_FILTER_FIELDS;

  protected readonly acciones = masterActions(MODELO.general.contacto, {
    row: CONTACTOS_ROW_ACTIONS,
    primary: CONTACTOS_PRIMARY_ACTION,
    trailing: CONTACTOS_TRAILING_ACTIONS,
  });

  constructor() {
    this.loadList();
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
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

  protected openFilters(focusRow: number | null = null): void {
    this.filterFocusRow.set(focusRow);
    this.filtersVisible.set(true);
  }

  /**
   * Filtros confirmados desde el modal. Se persisten en localStorage para que
   * sobrevivan a recargas hasta que el usuario los limpie.
   */
  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(this.storageKey, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  /** Quita una sola condición desde su píldora, sin pasar por el modal. */
  protected removeFilter(index: number): void {
    this.onFiltersApply(this.activeFilters().filter((_, i) => i !== index));
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(this.storageKey);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Contacto[]);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const contacto = event.row as Contacto;
    switch (event.actionId) {
      case 'view':
        this.navigateToDetail(contacto.id);
        break;
      case 'edit':
        this.navigateToEdit(contacto.id);
        break;
      case 'delete':
        this.confirmRemove([contacto.id]);
        break;
    }
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'new':
        this.router.navigate(this.buildRouteCommands('nuevo'));
        break;
      case 'export-excel':
        this.exportExcel();
        break;
      case 'import':
        this.importar.open();
        break;
    }
  }

  protected onSearchChange(value: string): void {
    // El toolbar ya emite el término debounced; aquí solo aplicamos y recargamos.
    this.searchValue.set(value);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onRefresh(): void {
    this.loadList();
  }

  protected removeSelected(): void {
    const ids = this.selectedRows().map((c) => c.id);
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download('/general/contacto/excel/', {
        method: 'POST',
        body: {
          filtros: buildFiltros(this.withRolFilter(this.activeFilters())),
          ordenamientos: buildOrdenamientos(this.sort()),
        },
        fallbackFilename: 'contactos.xlsx',
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
    // La búsqueda rápida se añade como un filtro `contiene` más, combinado (AND)
    // con los filtros avanzados activos.
    const search = quickSearchCondition(CONTACTOS_QUICK_SEARCH_FIELD, this.searchValue());
    const filters = this.withRolFilter(
      search ? [...this.activeFilters(), search] : this.activeFilters(),
    );

    const query: ListQuery = {
      filters,
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

  /** Antepone el filtro fijo del módulo (si lo hay) a los del usuario. */
  private withRolFilter(filters: readonly FilterCondition[]): readonly FilterCondition[] {
    return this.rol ? [contactoRolFilter(this.rol), ...filters] : filters;
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
    this.service
      .remove(ids)
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
        error: (err: unknown) => {
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            extractErrorMessage(err, this.t().common.toasts.deleteError.desc),
          );
        },
      });
  }

  private navigateToEdit(id: number): void {
    this.router.navigate(this.buildRouteCommands('editar', id));
  }

  private navigateToDetail(id: number): void {
    this.router.navigate(this.buildRouteCommands('detalle', id));
  }

  /**
   * Construye los segmentos absolutos para `router.navigate` dentro del feature.
   * Resulta en `/t/<slug>/<módulo activo>/contactos/<...path>`.
   */
  private buildRouteCommands(...subPath: (string | number)[]): (string | number)[] {
    const slug = this.tenant.currentSlug();
    if (!slug) throw new Error('Cannot navigate without an active tenant slug.');
    return ['/t', slug, currentModuleId(this.activeModule), 'contactos', ...subPath];
  }
}
