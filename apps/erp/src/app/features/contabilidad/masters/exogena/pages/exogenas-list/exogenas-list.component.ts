import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { finalize } from 'rxjs';
import {
  FilterStorageService,
  I18nService,
  TenantService,
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
import type { AppDict } from '@erp/i18n';
import {
  EXOGENA_COLUMNS,
  EXOGENA_FILTERS_STORAGE_KEY,
  EXOGENA_FILTER_FIELDS,
  EXOGENA_LIST_PATH,
  EXOGENA_ORDEN_DEFECTO,
  EXOGENA_PRIMARY_ACTION,
  EXOGENA_ROW_ACTIONS,
} from '../../exogena.constants';
import type { Exogena } from '../../exogena.model';
import { ExogenaService } from '../../exogena.service';

@Component({
  selector: 'app-exogenas-list',
  standalone: true,
  imports: [
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './exogenas-list.component.html',
})
export class ExogenasListComponent {
  private readonly service = inject(ExogenaService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly columns = EXOGENA_COLUMNS;
  protected readonly filterFields = EXOGENA_FILTER_FIELDS;
  protected readonly rowActions = EXOGENA_ROW_ACTIONS;
  protected readonly primaryAction = EXOGENA_PRIMARY_ACTION;

  protected readonly items = signal<readonly Exogena[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>(EXOGENA_ORDEN_DEFECTO);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(EXOGENA_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      { label: this.t().entities.exogena.name },
    ];
  });

  constructor() {
    this.loadList();
  }

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
    this.filterStorage.write(EXOGENA_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(EXOGENA_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const exogena = event.row as Exogena;
    switch (event.actionId) {
      case 'view':
        this.navigateTo('detalle', exogena.id);
        break;
      case 'edit':
        this.navigateTo('editar', exogena.id);
        break;
      case 'delete':
        this.confirmRemove(exogena.id);
        break;
    }
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'new') this.navigateTo('nuevo');
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
        },
      });
  }

  private confirmRemove(id: number): void {
    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().entities.exogena.confirmDelete,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(id),
    });
  }

  private executeRemove(id: number): void {
    this.service
      .remove(id)
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
        },
      });
  }

  private navigateTo(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...EXOGENA_LIST_PATH, ...subPath]);
  }
}
