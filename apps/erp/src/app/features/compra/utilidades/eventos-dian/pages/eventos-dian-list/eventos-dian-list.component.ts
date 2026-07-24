import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
  type ToolbarAction,
} from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { EventosDianService } from '../../eventos-dian.service';
import {
  EventosDianRow,
  EventosDianViewRow,
  normalizarEstadoEvento,
} from '../../eventos-dian.model';
import {
  BASE_FILTERS,
  COLUMNS,
  DEFAULT_SORT,
  FILTERS_STORAGE_KEY,
  FILTER_FIELDS,
  ROW_ACTIONS,
  ROW_ACTION_DESCARTAR,
  ROW_ACTION_EDITAR,
  ROW_ACTION_EMITIR,
  ROW_ACTION_GESTIONAR,
} from '../../eventos-dian.constants';
import { EditarReferenciaModalComponent } from '../../components/editar-referencia-modal/editar-referencia-modal.component';
import { GestionEstadoModalComponent } from '../../components/gestion-estado-modal/gestion-estado-modal.component';
import { ImportarZipModalComponent } from '../../components/importar-zip-modal/importar-zip-modal.component';

/**
 * Utilidad **Eventos DIAN** del módulo Compra.
 *
 * Recepción de documentos electrónicos de proveedores: lista con el chrome
 * estándar (`<lib-list-shell>`), filtros y acciones por fila condicionadas por
 * el estado del documento y de sus eventos DIAN:
 *  - **Editar** referencia (modal) — solo no electrónicos.
 *  - **Emitir** a la DIAN (directo) — solo no electrónicos.
 *  - **Gestionar** el acuse (modal) — electrónicos con algún evento pendiente.
 *  - **Descartar** (confirmación).
 *
 * Import ZIP del legacy queda pendiente (fase aparte).
 */
@Component({
  selector: 'app-eventos-dian-list',
  standalone: true,
  imports: [
    ConfirmDialogModule,
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    EditarReferenciaModalComponent,
    GestionEstadoModalComponent,
    ImportarZipModalComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './eventos-dian-list.component.html',
  styleUrl: './eventos-dian-list.component.scss',
})
export class EventosDianListComponent {
  private readonly service = inject(EventosDianService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ──────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly EventosDianViewRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>(DEFAULT_SORT);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);

  // ── Estado de los modales ─────────────────────────────────────────────────
  protected readonly activeRow = signal<EventosDianViewRow | null>(null);
  protected readonly editarVisible = signal(false);
  protected readonly gestionVisible = signal(false);
  protected readonly importarVisible = signal(false);

  /** Acción destacada del toolbar: abre el wizard de importar ZIP. */
  protected readonly primaryAction: ToolbarAction = {
    id: 'importar-zip',
    labelKey: 'entities.eventosDian.importar.action',
    iconClass: 'pi pi-file-import',
  };

  // ── Derivados ─────────────────────────────────────────────────────────────
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.eventosDian.name },
    ];
  });

  protected readonly columns = COLUMNS;
  protected readonly filterFields = FILTER_FIELDS;
  protected readonly rowActions = ROW_ACTIONS;

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

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'importar-zip') this.importarVisible.set(true);
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

  protected onRowAction(event: RowActionInvokedEvent): void {
    const row = event.row as EventosDianViewRow;
    switch (event.actionId) {
      case ROW_ACTION_EDITAR:
        this.activeRow.set(row);
        this.editarVisible.set(true);
        break;
      case ROW_ACTION_EMITIR:
        this.emitir(row);
        break;
      case ROW_ACTION_GESTIONAR:
        this.activeRow.set(row);
        this.gestionVisible.set(true);
        break;
      case ROW_ACTION_DESCARTAR:
        this.confirmDescartar(row);
        break;
    }
  }

  /** Refresca la lista tras guardar en cualquiera de los modales. */
  protected onModalSaved(): void {
    this.loadList();
  }

  // ── Acciones ────────────────────────────────────────────────────────────────

  private emitir(row: EventosDianViewRow): void {
    if (this.isProcessing()) return;
    const toast = this.t().entities.eventosDian.toasts.emitir;
    this.isProcessing.set(true);
    this.service
      .emitir(row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isProcessing.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toast.success.title, toast.success.desc);
          this.loadList();
        },
        error: () => this.toast.error(toast.error.title, toast.error.desc),
      });
  }

  private confirmDescartar(row: EventosDianViewRow): void {
    const dict = this.t().entities.eventosDian.descartar.confirm;
    this.confirmation.confirm({
      header: dict.header,
      message: dict.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: dict.accept,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.descartar(row),
    });
  }

  private descartar(row: EventosDianViewRow): void {
    const toast = this.t().entities.eventosDian.toasts.descartar;
    this.service
      .descartar(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(toast.success.title, toast.success.desc);
          this.loadList();
        },
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

/** Enriquece una fila cruda con los códigos de evento normalizados. */
function toViewRow(row: EventosDianRow): EventosDianViewRow {
  return {
    ...row,
    evento_documento_estado: normalizarEstadoEvento(row.evento_documento),
    evento_recepcion_estado: normalizarEstadoEvento(row.evento_recepcion),
    evento_aceptacion_estado: normalizarEstadoEvento(row.evento_aceptacion),
  };
}
