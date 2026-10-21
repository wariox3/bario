import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { finalize, forkJoin } from 'rxjs';
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
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { DocumentoElectronicoEmisionService } from '../../documento-electronico-emision.service';
import { clasificarEmision } from '../../documento-electronico.types';
import type {
  DocumentoPorEmitirFila,
  EmitirDocumentoElectronicoConfig,
} from '../../emision-electronica.types';
import {
  ESTADO_ELECTRONICO_COLUMN,
  VER_ERROR_ACTION_ID,
  aFilaPorEmitir,
  esSeleccionable,
  esperaRespuesta,
} from '../../estado-electronico';
import { ErrorElectronicoDialogComponent } from '../error-electronico-dialog/error-electronico-dialog.component';

/**
 * Pantalla **Emitir documento electrónico**: la lista de lo que hay por emitir
 * a la DIAN, igual para facturas de venta, documentos de compra y nóminas.
 *
 * Cada módulo solo aporta su `EmitirDocumentoElectronicoConfig` por el
 * `data.config` de la ruta: filtros permanentes, columnas, filtros del usuario,
 * textos y si ofrece Descartar. El resto es común:
 *  - **Emitir**: un solo request con las seleccionadas aún no enviadas. El 200
 *    no dice que todo salió bien: el aviso se elige según `con_error`.
 *  - **Descartar** (opcional): irreversible, con confirmación; un request por
 *    documento.
 *  - **Estado**: la columna la agrega el componente; "Error" abre el modal con
 *    los motivos del último intento.
 *
 * ```ts
 * { path: '', loadComponent: () => import('…').then((m) => m.EmitirDocumentoElectronicoComponent),
 *   data: { config: ENVIAR_NOMINA_ELECTRONICA } }
 * ```
 */
@Component({
  selector: 'app-emitir-documento-electronico',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    ListShellComponent,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ErrorElectronicoDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './emitir-documento-electronico.component.html',
})
export class EmitirDocumentoElectronicoComponent implements OnInit {
  private readonly service = inject(DocumentoElectronicoEmisionService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Lo que distingue a la pantalla; llega por el `data.config` de la ruta. */
  readonly config = input.required<EmitirDocumentoElectronicoConfig>();

  protected readonly textos = computed(() => this.config().textos(this.t()));
  protected readonly columns = computed(() => [
    ...this.config().columns,
    ESTADO_ELECTRONICO_COLUMN,
  ]);

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly items = signal<readonly DocumentoPorEmitirFila[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly sort = signal<readonly SortSpec[]>([]);
  protected readonly selectedRows = signal<readonly DocumentoPorEmitirFila[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);

  /** Documento cuyo error de emisión muestra el modal. */
  protected readonly errorDocumento = signal<DocumentoPorEmitirFila | null>(null);
  protected readonly errorVisible = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  /** Migas: módulo activo (navegable a su home) → esta pantalla. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.textos().name },
    ];
  });

  /** Las filas que esperan respuesta de la DIAN no pintan check. */
  protected readonly esSeleccionable = esSeleccionable;

  /** Seleccionadas que aún se pueden emitir; resguardo si una cambió de estado. */
  private readonly emitibles = computed(() =>
    this.selectedRows().filter((row) => !esperaRespuesta(row)),
  );

  protected readonly canEmitir = computed(
    () => !this.isProcessing() && this.emitibles().length > 0,
  );

  /** Descartar aplica a cualquier selección: saca el documento del ciclo. */
  protected readonly canDescartar = computed(
    () => !this.isProcessing() && this.selectedRows().length > 0,
  );

  /** Los inputs del router se asignan antes de `ngOnInit`, no en el constructor. */
  ngOnInit(): void {
    this.activeFilters.set(this.filterStorage.read(this.config().storageKey));
    this.loadList();
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
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
    this.filterStorage.write(this.config().storageKey, filters);
    this.currentPage.set(0);
    this.loadList();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(this.config().storageKey);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as DocumentoPorEmitirFila[]);
  }

  /** Clic en el estado "Error" de una fila: abre el detalle del error. */
  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== VER_ERROR_ACTION_ID) return;
    this.errorDocumento.set(event.row as DocumentoPorEmitirFila);
    this.errorVisible.set(true);
  }

  protected onEmitir(): void {
    const ids = this.emitibles().map((row) => row.id);
    if (ids.length === 0) return;
    const toast = this.textos().toasts.emitir;
    const conError = this.t().documentActions.errorElectronico.toasts;
    this.isProcessing.set(true);
    this.service
      .emitir(ids)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.terminarAccion()),
      )
      .subscribe({
        next: (resultado) => {
          switch (clasificarEmision(resultado)) {
            case 'exito':
              this.toast.success(toast.success.title, toast.success.desc);
              break;
            case 'parcial':
              this.toast.warn(conError.parcial.title, conError.parcial.desc);
              break;
            case 'fallo':
              this.toast.error(conError.fallo.title, conError.fallo.desc);
              break;
          }
        },
        error: (err: unknown) =>
          this.toast.error(toast.error.title, extractErrorMessage(err, toast.error.desc)),
      });
  }

  protected onDescartar(): void {
    const ids = this.selectedRows().map((row) => row.id);
    const { descartar, toasts } = this.textos();
    if (ids.length === 0 || !descartar || !toasts.descartar) return;
    const toast = toasts.descartar;
    this.confirmation.confirm({
      header: descartar.confirm.header,
      message: descartar.confirm.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: descartar.confirm.accept,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.isProcessing.set(true);
        forkJoin(ids.map((id) => this.service.descartar(id)))
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.terminarAccion()),
          )
          .subscribe({
            next: () => this.toast.success(toast.success.title, toast.success.desc),
            error: () => this.toast.error(toast.error.title, toast.error.desc),
          });
      },
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** Tras emitir o descartar: suelta los botones, limpia la selección y recarga. */
  private terminarAccion(): void {
    this.isProcessing.set(false);
    this.selectedRows.set([]);
    this.loadList();
  }

  private loadList(): void {
    const query: ListQuery = {
      filters: this.activeFilters(),
      sort: this.sort(),
      page: this.currentPage(),
    };

    this.isLoading.set(true);
    this.service
      .listar(query, this.config().baseFilters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results.map(aFilaPorEmitir));
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
