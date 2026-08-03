import {
  Component,
  DestroyRef,
  type WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { forkJoin, finalize, type Observable } from 'rxjs';
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
  BreadcrumbComponent,
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { EnviarFacturaElectronicaService } from '../../enviar-factura-electronica.service';
import {
  DocumentoElectronicoRow,
  DocumentoElectronicoViewRow,
  resolverEstadoElectronico,
} from '../../enviar-factura-electronica.model';
import {
  EMITIR_BASE_FILTERS,
  EMITIR_COLUMNS,
  EMITIR_FILTERS_STORAGE_KEY,
  EMITIR_FILTER_FIELDS,
  NOTIFICAR_BASE_FILTERS,
  NOTIFICAR_COLUMNS,
  NOTIFICAR_FILTERS_STORAGE_KEY,
  NOTIFICAR_FILTER_FIELDS,
} from '../../enviar-factura-electronica.constants';

/** Dependencias que un `TabController` comparte con el componente host. */
interface TabDeps {
  readonly service: EnviarFacturaElectronicaService;
  readonly filterStorage: FilterStorageService;
  readonly toast: ToastService;
  readonly t: () => AppDict;
  readonly destroyRef: DestroyRef;
}

/**
 * Estado y comportamiento de listado de **un** tab (Emitir o Notificar).
 *
 * Encapsula la mecánica idéntica de ambos tabs —paginación, orden, filtros y
 * selección— para que el componente solo orqueste las acciones batch propias
 * de cada uno. No es un componente: es un colaborador ligero con signals.
 */
class TabController {
  readonly items = signal<readonly DocumentoElectronicoViewRow[]>([]);
  readonly totalCount = signal(0);
  readonly isLoading = signal(false);
  readonly currentPage = signal(0);
  readonly pageSize = signal(25);
  readonly sort = signal<readonly SortSpec[]>([]);
  readonly selectedRows = signal<readonly DocumentoElectronicoViewRow[]>([]);
  readonly activeFilters: WritableSignal<readonly FilterCondition[]>;
  readonly filtersVisible = signal(false);

  /** `true` una vez que el tab cargó su lista por primera vez (carga perezosa). */
  private loaded = false;

  constructor(
    private readonly baseFilters: readonly FilterCondition[],
    private readonly storageKey: string,
    private readonly deps: TabDeps,
  ) {
    this.activeFilters = signal(this.deps.filterStorage.read(storageKey));
  }

  /** Carga la lista la primera vez que el tab se hace visible. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.loadList();
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadList();
  }

  onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort);
    this.currentPage.set(0);
    this.loadList();
  }

  openFilters(): void {
    this.filtersVisible.set(true);
  }

  applyFilters(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.deps.filterStorage.write(this.storageKey, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  clearFilters(): void {
    this.activeFilters.set([]);
    this.deps.filterStorage.clear(this.storageKey);
    this.currentPage.set(0);
    this.loadList();
  }

  onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as DocumentoElectronicoViewRow[]);
  }

  /** Recarga la lista (usado tras una acción batch). */
  reload(): void {
    this.selectedRows.set([]);
    this.loadList();
  }

  private loadList(): void {
    const query: ListQuery = {
      filters: this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.isLoading.set(true);
    this.deps.service
      .listar(query, this.baseFilters)
      .pipe(
        takeUntilDestroyed(this.deps.destroyRef),
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
          this.deps.toast.error(
            this.deps.t().common.toasts.loadError.title,
            this.deps.t().common.toasts.loadError.desc,
          );
        },
      });
  }
}

/** Enriquece una fila cruda con su estado electrónico derivado. */
function toViewRow(row: DocumentoElectronicoRow): DocumentoElectronicoViewRow {
  return { ...row, estado_electronico_estado: resolverEstadoElectronico(row) };
}

/**
 * Utilidad **Enviar factura electrónica** del módulo Venta.
 *
 * Página con dos tabs que replican el flujo del ciclo DIAN del legacy:
 *  - **Emitir**: facturas pendientes de enviar a la DIAN. Acciones batch
 *    *Emitir* y *Descartar* (esta última con confirmación).
 *  - **Notificar**: facturas ya emitidas, pendientes de avisar al cliente.
 *    Acción batch *Notificar*.
 *
 * Cada tab es un `TabController` (lista + filtros + selección); el componente
 * solo orquesta las acciones batch, que disparan un request por documento
 * seleccionado (`forkJoin`) y recargan al terminar.
 */
@Component({
  selector: 'app-enviar-factura-electronica',
  standalone: true,
  imports: [
    TabsModule,
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './enviar-factura-electronica.component.html',
  styleUrl: './enviar-factura-electronica.component.scss',
})
export class EnviarFacturaElectronicaComponent {
  private readonly service = inject(EnviarFacturaElectronicaService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Migas: módulo Venta (navegable a su home) → esta utilidad. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.venta.name,
        routerLink: slug ? ['/t', slug, 'venta'] : undefined,
      },
      { label: this.t().entities.enviarFacturaElectronica.name },
    ];
  });

  private readonly deps: TabDeps = {
    service: this.service,
    filterStorage: this.filterStorage,
    toast: this.toast,
    t: this.t,
    destroyRef: this.destroyRef,
  };

  protected readonly emitir = new TabController(
    EMITIR_BASE_FILTERS,
    EMITIR_FILTERS_STORAGE_KEY,
    this.deps,
  );
  protected readonly notificar = new TabController(
    NOTIFICAR_BASE_FILTERS,
    NOTIFICAR_FILTERS_STORAGE_KEY,
    this.deps,
  );

  /** Tab activo (`'emitir' | 'notificar'`). Controla el `<p-tabs>`. */
  protected readonly activeTab = signal<'emitir' | 'notificar'>('emitir');

  /** `true` mientras corre una acción batch — bloquea los botones. */
  protected readonly isProcessing = signal(false);

  protected readonly emitirColumns = EMITIR_COLUMNS;
  protected readonly emitirFilterFields = EMITIR_FILTER_FIELDS;
  protected readonly notificarColumns = NOTIFICAR_COLUMNS;
  protected readonly notificarFilterFields = NOTIFICAR_FILTER_FIELDS;

  /**
   * Documentos seleccionados en Emitir que aún se pueden emitir (los que están
   * "Esperando respuesta" ya se enviaron y se excluyen, como en el legacy).
   */
  private readonly emitibles = computed(() =>
    this.emitir.selectedRows().filter((row) => !row.estado_electronico_enviado),
  );

  protected readonly canEmitir = computed(
    () => !this.isProcessing() && this.emitibles().length > 0,
  );
  protected readonly canDescartar = computed(
    () => !this.isProcessing() && this.emitir.selectedRows().length > 0,
  );
  protected readonly canNotificar = computed(
    () => !this.isProcessing() && this.notificar.selectedRows().length > 0,
  );

  constructor() {
    this.emitir.ensureLoaded();
  }

  protected onTabChange(value: string): void {
    const tab = value === 'notificar' ? 'notificar' : 'emitir';
    this.activeTab.set(tab);
    (tab === 'emitir' ? this.emitir : this.notificar).ensureLoaded();
  }

  // ── Acciones batch ──────────────────────────────────────────────────────────

  protected onEmitir(): void {
    const ids = this.emitibles().map((row) => row.id);
    if (ids.length === 0) return;
    this.runBatch(
      ids.map((id) => this.service.emitir(id)),
      this.emitir,
      this.t().entities.enviarFacturaElectronica.toasts.emitir,
    );
  }

  protected onNotificar(): void {
    const ids = this.notificar.selectedRows().map((row) => row.id);
    if (ids.length === 0) return;
    this.runBatch(
      ids.map((id) => this.service.notificar(id)),
      this.notificar,
      this.t().entities.enviarFacturaElectronica.toasts.notificar,
    );
  }

  protected onDescartar(): void {
    const ids = this.emitir.selectedRows().map((row) => row.id);
    if (ids.length === 0) return;
    const dict = this.t().entities.enviarFacturaElectronica;
    this.confirmation.confirm({
      header: dict.descartar.confirm.header,
      message: dict.descartar.confirm.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: dict.descartar.confirm.accept,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.runBatch(
          ids.map((id) => this.service.descartar(id)),
          this.emitir,
          dict.toasts.descartar,
        ),
    });
  }

  /**
   * Ejecuta N requests en paralelo, recarga el tab al terminar y notifica.
   * `finalize` garantiza soltar el `isProcessing` incluso si algún request falla.
   */
  private runBatch(
    requests: readonly Observable<unknown>[],
    tab: TabController,
    toast: {
      readonly success: { title: string; desc: string };
      readonly error: { title: string; desc: string };
    },
  ): void {
    this.isProcessing.set(true);
    forkJoin(requests)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isProcessing.set(false);
          tab.reload();
        }),
      )
      .subscribe({
        next: () => this.toast.success(toast.success.title, toast.success.desc),
        error: () => this.toast.error(toast.error.title, toast.error.desc),
      });
  }
}
