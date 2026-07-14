import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@turnos/i18n';
import { PrototipoService } from '../../../../movimientos/programacion/prototipo.service';
import type { Prototipo } from '../../prototipo.model';
import {
  PROTOTIPOS_COLUMNS,
  PROTOTIPOS_FILTERS_STORAGE_KEY,
  PROTOTIPOS_FILTER_FIELDS,
  PROTOTIPOS_ROW_ACTIONS,
} from '../../prototipo.constants';

/**
 * Administrador de **prototipos** — listado de solo lectura.
 *
 * Master del módulo Turno (camino B): compone los building blocks compartidos
 * (`<lib-data-toolbar>` + `<lib-data-table>`) dentro de un `<lib-list-shell>`.
 * No tiene alta, edición ni borrado: solo lista y navega al detalle. El
 * prototipo se crea/edita desde el modal de la programación.
 */
@Component({
  selector: 'app-prototipos-list',
  standalone: true,
  imports: [ListShellComponent, DataTableComponent, DataToolbarComponent, DataFilterModalComponent],
  templateUrl: './prototipos-list.component.html',
  styleUrl: './prototipos-list.component.scss',
})
export class PrototiposListComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(PrototipoService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly Prototipo[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(PROTOTIPOS_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  // ── Migas: módulo Turno → entidad actual (Prototipos) ──────────────────────
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      { label: this.t().entities.prototipo.name },
    ];
  });

  protected readonly columns = PROTOTIPOS_COLUMNS;
  protected readonly filterFields = PROTOTIPOS_FILTER_FIELDS;
  protected readonly rowActions = PROTOTIPOS_ROW_ACTIONS;

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
    this.filterStorage.write(PROTOTIPOS_FILTERS_STORAGE_KEY, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(PROTOTIPOS_FILTERS_STORAGE_KEY);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId === 'view') this.navigateToDetail((event.row as Prototipo).id);
  }

  protected onRowClick(row: unknown): void {
    this.navigateToDetail((row as Prototipo).id);
  }

  protected onRefresh(): void {
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

  private navigateToDetail(id: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'prototipos', 'detalle', id]);
  }
}
