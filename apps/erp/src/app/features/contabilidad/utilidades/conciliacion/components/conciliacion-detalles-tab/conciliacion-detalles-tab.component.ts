import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileDownloadService, I18nService, ToastService, type FilterCondition } from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  type PageChangeEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ConciliacionService, CONCILIACION_EXCEL_SERIALIZADOR } from '../../conciliacion.service';
import type { ConciliacionDetalle } from '../../conciliacion.model';
import {
  CONCILIACION_DETALLE_COLUMNS,
  CONCILIACION_ESTADO_FILTER_FIELDS,
  CONCILIACION_TAB_PAGE_SIZE,
} from '../../conciliacion.constants';

/**
 * Pestaña del **libro**: los movimientos contables de la cuenta bancaria dentro
 * del periodo de la conciliación.
 *
 * Las líneas las genera el backend ("Cargar"), no se teclean. "Conciliar" es el
 * cruce contra el extracto y marca `estado_conciliado` en los dos lados, así que
 * al terminar avisa al padre para que refresque también la otra pestaña.
 *
 * `canOperate` decide si se renderizan las acciones: el formulario de edición lo
 * prende, la ficha de solo lectura no.
 */
@Component({
  selector: 'app-conciliacion-detalles-tab',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, DataTableComponent, DataFilterModalComponent],
  providers: [ConfirmationService],
  templateUrl: './conciliacion-detalles-tab.component.html',
})
export class ConciliacionDetallesTabComponent {
  private readonly service = inject(ConciliacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Conciliación a la que pertenecen los movimientos. */
  readonly conciliacionId = input.required<number>();

  /** Muestra las acciones (cargar, conciliar, limpiar). La ficha las apaga. */
  readonly canOperate = input<boolean>(false);

  /**
   * Señal externa para forzar una recarga. La usa el padre cuando otra pestaña
   * hizo algo que afecta a esta —hoy, el "Conciliar" del extracto no existe,
   * pero sí al revés—; cambiar el número dispara el `effect`.
   */
  readonly reloadToken = input<number>(0);

  /** Avisa al padre que el cruce corrió y la otra pestaña quedó desactualizada. */
  readonly conciliadoChange = output<void>();

  protected readonly items = signal<readonly ConciliacionDetalle[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);
  /** Alguna operación en vuelo: bloquea toda la botonera para no encadenarlas. */
  protected readonly isBusy = signal(false);

  protected readonly pageSize = CONCILIACION_TAB_PAGE_SIZE;
  protected readonly columns = CONCILIACION_DETALLE_COLUMNS;
  protected readonly filterFields = CONCILIACION_ESTADO_FILTER_FIELDS;

  protected readonly hasItems = computed(() => this.totalCount() > 0);

  constructor() {
    // Carga inicial y recargas pedidas por el padre.
    effect(() => {
      this.conciliacionId();
      this.reloadToken();
      this.loadPage(0);
    });
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.loadPage(event.page);
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.loadPage(0);
  }

  /** Trae del libro los movimientos del periodo. */
  protected onCargar(): void {
    if (this.isBusy()) return;
    this.run(this.service.cargarDetalles(this.conciliacionId()), 'cargar');
  }

  /** Cruza libro contra extracto; al terminar refresca ambas pestañas. */
  protected onConciliar(): void {
    if (this.isBusy()) return;
    this.run(this.service.conciliar(this.conciliacionId()), 'conciliar', () =>
      this.conciliadoChange.emit(),
    );
  }

  /** Borra los movimientos cargados, previa confirmación destructiva. */
  protected onLimpiar(): void {
    if (this.isBusy()) return;
    const labels = this.t().entities.conciliacion.detalleTab;
    this.confirmation.confirm({
      header: labels.confirmLimpiar.header,
      message: labels.confirmLimpiar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.run(this.service.limpiarDetalles(this.conciliacionId()), 'limpiar'),
    });
  }

  protected onExportExcel(): void {
    this.fileDownload
      .download(this.service.exportDetalleUrl, {
        method: 'POST',
        body: {
          conciliacion_id: this.conciliacionId(),
          serializador: CONCILIACION_EXCEL_SERIALIZADOR,
        },
        fallbackFilename: 'conciliacion-detalles.xlsx',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Ejecuta una de las tres operaciones y recarga la tabla. Todas comparten el
   * mismo esqueleto (bloquear, avisar, recargar); lo único que cambia son los
   * textos del toast y un efecto opcional al terminar bien.
   */
  private run(
    operation: ReturnType<ConciliacionService['cargarDetalles']>,
    key: 'cargar' | 'conciliar' | 'limpiar',
    onSuccess?: () => void,
  ): void {
    this.isBusy.set(true);
    const toasts = this.t().entities.conciliacion.detalleTab.toasts[key];
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isBusy.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.success.title, toasts.success.desc);
          onSuccess?.();
          this.loadPage(0);
        },
        error: () => this.toast.error(toasts.error.title, toasts.error.desc),
      });
  }

  /** Recarga la tabla. Fuerza recargar desde la página pedida (0-based). */
  loadPage(page: number): void {
    const id = this.conciliacionId();
    if (!id) return;
    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .listarDetalles(id, page + 1, this.pageSize, this.activeFilters())
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
