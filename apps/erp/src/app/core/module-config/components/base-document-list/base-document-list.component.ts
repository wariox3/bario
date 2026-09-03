import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
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
  type FilterCondition,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  ListShellComponent,
} from '@reddoc/feature-base';
import type {
  BreadcrumbItem,
  PageChangeEvent,
  RowAction,
  RowActionInvokedEvent,
  ToolbarAction,
} from '@reddoc/feature-base';
import { ENTITY_ACTION_STRATEGY } from '../../actions/entity-action.token';
import type { EntityActionStrategy } from '../../actions/entity-action-strategy';
import {
  type DocumentEntityConfig,
  type EditableRowContext,
  ENTITY_DATA_GATEWAY,
} from '@reddoc/core';
import { MissingModuleContextError } from '../../errors/config.errors';
import { ModuleNavigationStore } from '../../module-navigation.store';
import { buildEntityStorageKey } from '../../storage/build-entity-storage-key';

/** Tamaño de página default mientras `DocumentEntityConfig` no exponga `paginationDefaults`. */
const DEFAULT_PAGE_SIZE = 25;

/** Acción primaria "Nuevo" del toolbar — derivada de `capabilities.canCreate`. */
const NEW_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

/**
 * Componente base de listado para **documentos transaccionales** del framework
 * configuracional (camino A — ver docs/architecture).
 *
 * Recibe el `DocumentEntityConfig` por input (resuelto por `activeDocumentResolver`)
 * y compone `<lib-data-table>` con columnas, filtros y capacidades derivadas
 * del config.
 *
 * Responsabilidades:
 *  - Cargar datos paginados desde `EntityDataGateway`.
 *  - Restaurar filtros del usuario desde `FilterStorageService`
 *    (clave versionada por `entity.schemaVersion`).
 *  - Mostrar acciones de toolbar y de fila según `capabilities`.
 *  - Navegar a las rutas `new` / `edit` / `detail` del documento.
 *
 * Lo que NO hace:
 *  - HTTP directo (delega en `ENTITY_DATA_GATEWAY` — DIP).
 *  - Conocer el módulo activo desde el URL (lee el `ModuleNavigationStore`).
 *  - Renderizar el form ni el detalle.
 */
@Component({
  selector: 'app-base-document-list',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './base-document-list.component.html',
  styleUrl: './base-document-list.component.scss',
})
export class BaseDocumentListComponent {
  // ── Colaboradores inyectados ──────────────────────────────────────────────
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly navigation = inject(ModuleNavigationStore);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<unknown>>(I18nService);

  /**
   * Strategies de acciones extra registrados en `ENTITY_ACTION_STRATEGY`.
   * `optional` para no romper contextos sin acciones registradas (tests, otras apps).
   */
  private readonly actionStrategies = inject(ENTITY_ACTION_STRATEGY, { optional: true }) ?? [];

  // ── Inputs ────────────────────────────────────────────────────────────────
  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  // ── Estado interno ────────────────────────────────────────────────────────
  protected readonly items = signal<readonly unknown[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly unknown[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────
  protected readonly columns = computed(() => this.document().columns);
  protected readonly capabilities = computed(() => this.document().capabilities);
  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /** Campos filtrables declarados por el documento (vacío ⇒ sin filtros). */
  protected readonly filterFields = computed(() => this.document().filters);
  protected readonly filtersEnabled = computed(() => this.document().filters.length > 0);

  /** Acción primaria del toolbar; solo si el documento permite crear. */
  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.capabilities().canCreate ? NEW_ACTION : null,
  );

  /**
   * Strategies de acción extra que este documento expone, en el orden de
   * `extraActionIds`, filtrados por su `isAvailable`. Open/Closed: el componente
   * no conoce ninguna acción concreta, solo el contrato `EntityActionStrategy`.
   */
  private readonly availableStrategies = computed<readonly EntityActionStrategy[]>(() => {
    const doc = this.document();
    return (doc.extraActionIds ?? [])
      .map((id) => this.actionStrategies.find((s) => s.id === id))
      .filter((s): s is EntityActionStrategy => s !== undefined)
      .filter((s) => s.isAvailable?.(doc) ?? true);
  });

  /**
   * Acciones extra del toolbar, repartidas según el `placement` de cada strategy:
   * las de `'button'` quedan como botones sueltos y el resto se agrupa en un
   * único dropdown "Acciones" (el toolbar lo renderiza como menú cuando el
   * `ToolbarAction` trae `children`). Orden final:
   *
   *   [botón suelto…] [Acciones ▾] │ [refresh] [Nuevo]
   *
   * Al elegir un hijo del dropdown, el toolbar emite el `id` **del hijo** → lo
   * resuelve `onToolbarAction` igual que un botón suelto. Cada grupo se omite si
   * queda vacío: un documento sin acciones no dibuja nada, y uno cuyas acciones
   * son todas `'button'` no dibuja el dropdown.
   */
  protected readonly trailingActions = computed<readonly ToolbarAction[]>(() => {
    const strategies = this.availableStrategies();
    const standalone = strategies
      .filter((s) => s.placement === 'button')
      .map((s) => s.toolbarAction);
    const children = strategies
      .filter((s) => (s.placement ?? 'menu') === 'menu')
      .map((s) => s.toolbarAction);

    if (children.length === 0) return standalone;
    return [
      ...standalone,
      {
        id: 'actions',
        labelKey: 'common.actions.actions',
        iconClass: '',
        children,
      },
    ];
  });

  /**
   * El toolbar solo se monta si aporta algo: crear, filtrar, eliminar o alguna
   * acción extra. Un documento solo-lista (todas las capabilities en `false`, sin
   * filtros ni acciones) no lo muestra — queda card + tabla, sin barra vacía.
   */
  protected readonly showToolbar = computed(
    () =>
      this.capabilities().canCreate ||
      this.filtersEnabled() ||
      this.capabilities().canDelete ||
      this.trailingActions().length > 0,
  );

  /** Clave de persistencia de filtros, versionada por `schemaVersion` del documento. */
  protected readonly storageKey = computed(() =>
    buildEntityStorageKey(this.activeModuleId(), this.document()),
  );

  /**
   * Migas: módulo activo (navegable a su home) → documento actual. El módulo
   * sale del `ModuleNavigationStore`; el documento, de su `displayNameKey`.
   */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const moduleConfig = this.navigation.activeModule();
    const slug = this.tenant.currentSlug();
    const items: BreadcrumbItem[] = [];
    if (moduleConfig) {
      items.push({
        label: this.translate(moduleConfig.displayNameKey),
        routerLink: slug ? ['/t', slug, moduleConfig.id] : undefined,
      });
    }
    items.push({ label: this.translate(this.document().displayNameKey) });
    return items;
  });

  /** Acciones disponibles desde el menú de cada fila, derivadas de capabilities. */
  protected readonly rowActions = computed<readonly RowAction[]>(() => {
    const caps = this.capabilities();
    const actions: RowAction[] = [];
    if (caps.canEdit) {
      // La acción se oculta por fila según la política declarativa del
      // documento (`canEditRow`): un documento aprobado, p. ej., no se edita.
      const canEditRow = this.document().canEditRow;
      actions.push({
        id: 'edit',
        labelKey: 'common.actions.edit',
        iconClass: 'pi pi-pencil',
        inline: true,
        visibleFor: canEditRow ? (row) => canEditRow(row as EditableRowContext) : undefined,
      });
    }
    if (caps.canView) {
      actions.push({
        id: 'view',
        labelKey: 'common.actions.view',
        iconClass: 'pi pi-eye',
        inline: true,
      });
    }
    if (caps.canDelete) {
      actions.push({
        id: 'delete',
        labelKey: 'common.actions.delete',
        iconClass: 'pi pi-trash',
        severity: 'danger',
      });
    }
    return actions;
  });

  /** Id del módulo activo según el `ModuleNavigationStore`. */
  protected readonly activeModuleId = computed(() => {
    const moduleConfig = this.navigation.activeModule();
    if (!moduleConfig) throw new MissingModuleContextError();
    return moduleConfig.id;
  });

  constructor() {
    // Cuando cambia el documento (navegación entre documentos del mismo módulo),
    // restauramos los filtros guardados y recargamos la lista.
    //
    // El `effect` debe reaccionar SOLO al cambio de documento/módulo (`storageKey`).
    // El cuerpo va en `untracked` porque `loadList()` lee `currentPage`/`pageSize`/
    // `sort`/`activeFilters`: sin `untracked`, esas señales se volverían
    // dependencias y cada cambio de página re-dispararía el effect, que resetea
    // `currentPage` a 0 → la paginación rebotaría siempre a la primera página.
    effect(() => {
      const key = this.storageKey();
      untracked(() => {
        this.activeFilters.set(this.filterStorage.read(key));
        this.selectedRows.set([]);
        this.currentPage.set(0);
        this.loadList();
      });
    });
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadList();
  }

  /**
   * Ordenamiento multi-columna emitido por los headers de la tabla. Vuelve a la
   * primera página porque el orden cambia el conjunto visible.
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
   * Filtros confirmados desde el modal. Se persisten en localStorage (clave
   * versionada por documento) para que sobrevivan a recargas.
   */
  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(this.storageKey(), filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(this.storageKey());
    this.currentPage.set(0);
    this.loadList();
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'new') {
      this.navigateToNew();
      return;
    }
    // Acciones extra: delega en su strategy sin conocer su modal ni su endpoint.
    const strategy = this.availableStrategies().find((s) => s.id === actionId);
    strategy
      ?.execute({
        document: this.document(),
        query: this.currentQuery(),
        selectedIds: this.currentSelectedIds(),
        reload: () => this.loadList(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const id = this.extractId(event.row);
    if (id === null) return;
    switch (event.actionId) {
      case 'view':
        this.navigateToDetail(id);
        break;
      case 'edit':
        this.navigateToEdit(id);
        break;
      case 'delete':
        this.confirmRemove([id]);
        break;
    }
  }

  protected navigateToNew(): void {
    this.router.navigate(this.buildRouteCommands(this.document().routes.new));
  }

  protected removeSelected(): void {
    const ids = this.currentSelectedIds();
    if (ids.length === 0) return;
    this.confirmRemove(ids);
  }

  /** Resuelve una clave i18n con notación de punto. */
  protected translate(key: string): string {
    const dict = this.i18n.t();
    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** Ids de las filas seleccionadas; alimenta las acciones masivas del toolbar. */
  private currentSelectedIds(): readonly (string | number)[] {
    return this.selectedRows()
      .map((row) => this.extractId(row))
      .filter((id): id is string | number => id !== null);
  }

  /** Query activo (filtros/orden/paginación) que comparten `loadList` y las acciones. */
  private currentQuery(): ListQuery {
    return {
      filters: this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };
  }

  private loadList(): void {
    this.isLoading.set(true);
    this.gateway
      .list(this.document(), this.currentQuery())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results);
          this.totalCount.set(response.totalCount);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          this.toast.error(
            this.translate('common.toasts.loadError.title'),
            this.translate('common.toasts.loadError.desc'),
          );
        },
      });
  }

  private confirmRemove(ids: readonly (string | number)[]): void {
    this.confirmation.confirm({
      message: this.translate('common.confirms.deleteMessage'),
      header: this.translate('common.confirms.deleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate('common.actions.delete'),
      rejectLabel: this.translate('common.actions.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(ids),
    });
  }

  private executeRemove(ids: readonly (string | number)[]): void {
    this.gateway
      .remove(this.document(), ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(
            this.translate('common.toasts.deleteSuccess.title'),
            this.translate('common.toasts.deleteSuccess.desc'),
          );
          this.selectedRows.set([]);
          this.loadList();
        },
        error: () => {
          this.toast.error(
            this.translate('common.toasts.deleteError.title'),
            this.translate('common.toasts.deleteError.desc'),
          );
        },
      });
  }

  private navigateToEdit(id: string | number): void {
    this.router.navigate([...this.buildRouteCommands(this.document().routes.edit), id]);
  }

  private navigateToDetail(id: string | number): void {
    this.router.navigate([...this.buildRouteCommands(this.document().routes.detail), id]);
  }

  /**
   * Construye los segmentos absolutos de ruta para navegación interna,
   * a partir de un `routePath` declarado en `document.routes`.
   *
   * `routePath = 'documento/factura-compra/list'` →
   *   ['/t', '<slug>', '<moduleId>', 'documento', 'factura-compra', 'list']
   */
  private buildRouteCommands(routePath: string): (string | number)[] {
    const slug = this.tenant.currentSlug();
    if (!slug) throw new Error('Cannot navigate without an active tenant slug.');
    return ['/t', slug, this.activeModuleId(), ...routePath.split('/').filter(Boolean)];
  }

  private extractId(row: unknown): string | number | null {
    if (row === null || typeof row !== 'object') return null;
    const candidate = (row as Record<string, unknown>)['id'];
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return candidate;
    }
    return null;
  }
}
