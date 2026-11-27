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
import { finalize, map, type Observable } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  FileDownloadService,
  I18nService,
  ToastService,
  buildFiltros,
  extractErrorMessage,
  type FilterCondition,
} from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ConciliacionService, filtrosDeConciliacion } from '../../conciliacion.service';
import type { ConciliacionDetalle } from '../../conciliacion.model';
import { ConciliarDialogComponent } from '../conciliar-dialog/conciliar-dialog.component';
import {
  CONCILIACION_DETALLE_COLUMNS,
  CONCILIACION_ESTADO_FILTER_FIELDS,
} from '../../conciliacion.constants';

/** Las operaciones de la pestaña; la que corre pone su spinner. */
type OperacionDetalle = 'cargar' | 'conciliar' | 'desconciliar' | 'limpiar';

/**
 * Pestaña **Detalle**: los movimientos contables de la cuenta bancaria dentro
 * del periodo, más los pendientes de conciliaciones anteriores.
 *
 * Las líneas las trae el backend ("Cargar movimientos"), no se teclean.
 * "Conciliar" es el cruce contra el soporte y marca `estado_conciliado` en los
 * dos lados, así que al terminar avisa al padre para que refresque la otra
 * pestaña.
 */
@Component({
  selector: 'app-conciliacion-detalles-tab',
  standalone: true,
  imports: [
    ConfirmDialogModule,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConciliarDialogComponent,
  ],
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

  /** Muestra las acciones (cargar, conciliar, limpiar). */
  readonly canOperate = input<boolean>(false);

  /** Cambiar el número fuerza una recarga desde el padre. */
  readonly reloadToken = input<number>(0);

  /** Avisa al padre que el cruce corrió y la otra pestaña quedó desactualizada. */
  readonly conciliadoChange = output<void>();

  protected readonly items = signal<readonly ConciliacionDetalle[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);
  /** Fila del modal a enfocar al abrirlo desde una píldora; `null` desde el botón. */
  protected readonly filterFocusRow = signal<number | null>(null);
  /** Alguna operación en vuelo: bloquea toda la botonera para no encadenarlas. */
  /** Operación en vuelo: bloquea la botonera y pone el spinner en su botón. */
  protected readonly enCurso = signal<OperacionDetalle | null>(null);
  protected readonly isBusy = computed(() => this.enCurso() !== null);
  /** Diálogo que pide los días de tolerancia antes de conciliar. */
  protected readonly conciliarVisible = signal(false);

  protected readonly columns = CONCILIACION_DETALLE_COLUMNS;
  protected readonly filterFields = CONCILIACION_ESTADO_FILTER_FIELDS;

  protected readonly hasItems = computed(() => this.totalCount() > 0);

  /**
   * Acción destacada: conciliar. Siempre a la vista; sin movimientos cargados
   * o con otra operación en curso se ve deshabilitada (estándar de la botonera
   * de tabla: por estado se deshabilita, por permiso se oculta).
   */
  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.canOperate()
      ? {
          id: 'conciliar',
          labelKey: 'entities.conciliacion.detalleTab.conciliar',
          iconClass: 'pi pi-check-circle',
          disabled: !this.hasItems() || this.isBusy(),
        }
      : null,
  );

  /**
   * Botonera de tabla: «Cargar movimientos» a la vista (con su spinner) y en
   * «Acciones» el Excel primero, luego Desconciliar y, separado y en rojo,
   * Limpiar detalle.
   */
  protected readonly trailingActions = computed<readonly ToolbarAction[]>(() => {
    const sinItems = !this.hasItems();
    const children: ToolbarAction[] = [
      {
        id: 'export-excel',
        labelKey: 'common.actions.exportExcel',
        iconClass: 'pi pi-file-excel',
        disabled: sinItems,
      },
    ];
    if (this.canOperate()) {
      children.push(
        {
          id: 'desconciliar',
          labelKey: 'entities.conciliacion.detalleTab.desconciliar',
          iconClass: 'pi pi-replay',
          disabled: sinItems || this.isBusy(),
        },
        {
          id: 'limpiar',
          labelKey: 'entities.conciliacion.detalleTab.limpiar',
          iconClass: 'pi pi-trash',
          severity: 'danger',
          separatorBefore: true,
          disabled: sinItems || this.isBusy(),
        },
      );
    }
    const acciones: ToolbarAction = {
      id: 'actions',
      labelKey: 'common.actions.actions',
      iconClass: '',
      children,
    };
    if (!this.canOperate()) return [acciones];
    return [
      {
        id: 'cargar',
        labelKey: 'entities.conciliacion.detalleTab.cargar',
        iconClass: 'pi pi-download',
        disabled: this.isBusy(),
        loading: this.enCurso() === 'cargar',
      },
      acciones,
    ];
  });

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

  protected openFilters(focusRow: number | null = null): void {
    this.filterFocusRow.set(focusRow);
    this.filtersVisible.set(true);
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.loadPage(0);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'cargar':
        this.onCargar();
        break;
      case 'conciliar':
        this.onConciliar();
        break;
      case 'desconciliar':
        this.onDesconciliar();
        break;
      case 'limpiar':
        this.onLimpiar();
        break;
      case 'export-excel':
        this.onExportExcel();
        break;
    }
  }

  /** Quita una sola condición desde su píldora, sin pasar por el modal. */
  protected removeFilter(index: number): void {
    this.onFiltersApply(this.activeFilters().filter((_, i) => i !== index));
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.loadPage(0);
  }

  /** Trae del libro los movimientos del periodo. */
  private onCargar(): void {
    if (this.isBusy()) return;
    this.run(
      this.service.cargarDetalles(this.conciliacionId()).pipe(map((r) => ({ n: r.cargados }))),
      'cargar',
    );
  }

  /** Abre el diálogo de tolerancia; el cruce corre al confirmarlo. */
  private onConciliar(): void {
    if (this.isBusy()) return;
    this.conciliarVisible.set(true);
  }

  /**
   * Cruza detalle contra soporte con la tolerancia elegida. Al terminar bien
   * cierra el diálogo y refresca ambas pestañas; si falla, el diálogo queda
   * abierto para reintentar.
   */
  protected conciliar(dias: number): void {
    if (this.isBusy()) return;
    this.run(
      this.service.conciliar(this.conciliacionId(), dias).pipe(map((r) => ({ n: r.conciliados }))),
      'conciliar',
      () => {
        this.conciliarVisible.set(false);
        this.conciliadoChange.emit();
      },
    );
  }

  /**
   * Devuelve a pendiente todo lo conciliado en los dos lados (todo o nada) y
   * avisa al padre para que recargue el soporte.
   */
  private onDesconciliar(): void {
    if (this.isBusy()) return;
    const labels = this.t().entities.conciliacion.detalleTab.confirmDesconciliar;
    this.confirmation.confirm({
      header: labels.header,
      message: labels.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.accept,
      rejectLabel: this.t().common.actions.cancel,
      accept: () =>
        this.run(this.service.desconciliar(this.conciliacionId()), 'desconciliar', () =>
          this.conciliadoChange.emit(),
        ),
    });
  }

  /** Borra los movimientos cargados, previa confirmación destructiva. */
  private onLimpiar(): void {
    if (this.isBusy()) return;
    const labels = this.t().entities.conciliacion.detalleTab;
    this.confirmation.confirm({
      header: labels.confirmLimpiar.header,
      message: labels.confirmLimpiar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.run(
          this.service
            .limpiarDetalles(this.conciliacionId())
            .pipe(map((r) => ({ n: r.eliminados }))),
          'limpiar',
        ),
    });
  }

  private onExportExcel(): void {
    this.fileDownload
      .download(this.service.exportDetalleUrl, {
        method: 'POST',
        body: {
          filtros: buildFiltros(filtrosDeConciliacion(this.conciliacionId(), this.activeFilters())),
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
   * mismo esqueleto (bloquear, avisar, recargar); cambian los textos del toast,
   * los conteos que devuelve cada una (`{n}`, `{detalles}`…) y un efecto
   * opcional al terminar bien.
   *
   * La petición va sin toast del interceptor: acá se avisa todo status, con el
   * mensaje del backend (p. ej. el 400 de limpiar con líneas conciliadas).
   */
  private run(
    operation: Observable<Readonly<Record<string, number>>>,
    key: OperacionDetalle,
    onSuccess?: () => void,
  ): void {
    this.enCurso.set(key);
    const toasts = this.t().entities.conciliacion.detalleTab.toasts[key];
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enCurso.set(null)),
      )
      .subscribe({
        next: (conteos) => {
          this.toast.success(toasts.success.title, conConteos(toasts.success.desc, conteos));
          onSuccess?.();
          this.loadPage(0);
        },
        error: (err: unknown) =>
          this.toast.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc)),
      });
  }

  /** Recarga la tabla. Fuerza recargar desde la página pedida (0-based). */
  loadPage(page: number): void {
    const id = this.conciliacionId();
    if (!id) return;
    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .listarDetalles(id, page, this.activeFilters())
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

/** Reemplaza cada `{clave}` del texto por su conteo. */
function conConteos(texto: string, conteos: Readonly<Record<string, number>>): string {
  return Object.entries(conteos).reduce(
    (acc, [clave, valor]) => acc.replaceAll(`{${clave}}`, String(valor)),
    texto,
  );
}
