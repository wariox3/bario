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
import { EMPTY, filter, finalize, from, switchMap } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { FileDownloadService, I18nService, ToastService, type FilterCondition } from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
  type RowAction,
  type RowActionInvokedEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import type { AppDict } from '@erp/i18n';
import type { CapacidadesProgramacion } from '../../programacion.estado';
import type { ProgramacionDetalle } from '../../programacion.model';
import {
  PROGRAMACION_RENGLONES_PAGE_SIZE,
  RENGLONES_FILTER_FIELDS,
  tonoFechaDesde,
  tonoFechaHasta,
} from '../../programacion.constants';
import { columnasDeRenglones, muestraHoras } from '../../programacion.renglones';
import {
  PROGRAMACION_EXPORTS,
  ProgramacionService,
  cuerpoExportacion,
  type ProgramacionExportKey,
} from '../../programacion.service';

/**
 * Los **renglones** de la programación: un contrato por fila con su liquidación
 * del periodo.
 *
 * Las filas las genera el backend ("Cargar contratos"); desde acá se consultan,
 * se seleccionan y se eliminan. Las columnas dependen del tipo de pago —ver
 * `columnasDeRenglones`—, así que este único componente cubre lo que en el ERP
 * anterior eran tres tablas completas.
 *
 * **No decide qué se puede hacer**: recibe las capacidades ya calculadas por la
 * máquina de estados y solo las obedece.
 */
@Component({
  selector: 'app-programacion-renglones-tab',
  standalone: true,
  imports: [
    ConfirmDialogModule,
    DataFilterModalComponent,
    DataTableComponent,
    DataToolbarComponent,
  ],
  providers: [ConfirmationService, DialogService],
  templateUrl: './programacion-renglones-tab.component.html',
})
export class ProgramacionRenglonesTabComponent {
  private readonly service = inject(ProgramacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly programacionId = input.required<number>();

  /** Tipo de pago de la cabecera: decide las columnas. */
  readonly pagoTipoId = input<number | null>(null);

  /** Capacidades ya resueltas por `capacidadesDe`. */
  readonly capacidades = input.required<CapacidadesProgramacion>();

  /** Cambiar el número fuerza una recarga (lo usa el workspace tras generar). */
  readonly reloadToken = input<number>(0);

  /**
   * Cuántos renglones hay. El workspace lo necesita para decidir si se puede
   * generar (`capacidadesDe` exige renglones), así que el conteo sube.
   */
  readonly totalChange = output<number>();

  protected readonly items = signal<readonly ProgramacionDetalle[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly selectedRows = signal<readonly ProgramacionDetalle[]>([]);
  protected readonly isBusy = signal(false);

  protected readonly pageSize = PROGRAMACION_RENGLONES_PAGE_SIZE;

  /** Columnas según el tipo de pago. */
  protected readonly columns = computed(() => columnasDeRenglones(this.pagoTipoId()));

  /** Con horas hay que explicar las abreviaturas de las columnas. */
  protected readonly mostrarLeyenda = computed(() => muestraHoras(this.pagoTipoId()));

  /**
   * Qué colores de fecha hay en la página: la leyenda solo explica los que se
   * ven. Sale de las mismas funciones que pintan las celdas.
   */
  protected readonly hayIngresoRetiro = computed(() =>
    this.items().some(
      (row) => tonoFechaDesde(row) === 'positive' || tonoFechaHasta(row) === 'positive',
    ),
  );
  protected readonly hayErrorTerminacion = computed(() =>
    this.items().some((row) => tonoFechaDesde(row) === 'critical'),
  );

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /**
   * Acción de fila para ajustar el renglón. Solo se ofrece en borrador: en una
   * programación generada no hay nada que ajustar, y la tabla compartida no puede
   * deshabilitar una acción fila por fila — la lista se arma vacía y la columna
   * de acciones desaparece.
   */
  protected readonly rowActions = computed<readonly RowAction[]>(() => {
    const acciones: RowAction[] = [];
    if (this.capacidades().puedeEditarRenglon) {
      acciones.push({
        id: 'edit',
        labelKey: 'common.actions.edit',
        iconClass: 'pi pi-pencil',
        inline: true,
      });
    }
    // Ver la nómina generada solo tiene sentido cuando existe.
    if (this.capacidades().puedeImprimirNominas) {
      acciones.push({
        id: 'ver-nomina',
        labelKey: 'entities.programacion.renglones.verNomina',
        iconClass: 'pi pi-file',
        inline: true,
      });
    }
    return acciones;
  });

  /** Selección múltiple solo si se puede eliminar: seleccionar sin poder borrar no sirve. */
  protected readonly selectionMode = computed<'none' | 'multiple'>(() =>
    this.capacidades().puedeEliminarRenglon ? 'multiple' : 'none',
  );

  /**
   * "Cargar contratos" es la acción destacada. Se ofrece solo en borrador; el
   * dropdown de acciones queda vacío (y por tanto oculto) cuando no hay nada más.
   */
  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.capacidades().puedeCargarContratos && !this.isBusy()
      ? {
          id: 'cargar-contratos',
          labelKey: 'entities.programacion.renglones.cargarContratos',
          iconClass: 'pi pi-download',
        }
      : null,
  );

  /**
   * "Excel ▾" de la tabla: las tres exportaciones, junto a lo que exportan. El
   * botón va sin ícono, solo los ítems lo llevan. Nómina y nómina detalle
   * exportan documentos que existen desde que se genera: antes se ven
   * deshabilitados, como el resto de la botonera.
   */
  protected readonly trailingActions = computed<readonly ToolbarAction[]>(() => {
    const sinNominas = !this.capacidades().puedeImprimirNominas;
    return [
      {
        id: 'excel',
        labelKey: 'entities.programacion.renglones.excel.action',
        iconClass: '',
        children: [
          {
            id: 'excel:renglones',
            labelKey: 'entities.programacion.renglones.excel.detalle',
            iconClass: 'pi pi-file-excel',
          },
          {
            id: 'excel:nomina',
            labelKey: 'entities.programacion.renglones.excel.nomina',
            iconClass: 'pi pi-file-excel',
            disabled: sinNominas,
          },
          {
            id: 'excel:nominaDetalle',
            labelKey: 'entities.programacion.renglones.excel.nominaDetalle',
            iconClass: 'pi pi-file-excel',
            disabled: sinNominas,
          },
        ],
      },
    ];
  });

  // ── Filtros ───────────────────────────────────────────────────────────────
  // En memoria, no en el navegador: ver `RENGLONES_FILTER_FIELDS`.
  protected readonly filterFields = RENGLONES_FILTER_FIELDS;
  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);

  constructor() {
    effect(() => {
      this.programacionId();
      this.reloadToken();
      this.loadPage(0);
    });
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.loadPage(event.page);
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as ProgramacionDetalle[]);
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.loadPage(0);
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.loadPage(0);
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'cargar-contratos') this.cargarContratos();
    if (actionId.startsWith('excel:')) this.exportar(actionId.slice(6) as ProgramacionExportKey);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const renglon = event.row as ProgramacionDetalle;
    if (event.actionId === 'edit') this.abrirEdicion(renglon.id);
    if (event.actionId === 'ver-nomina') this.verNomina(renglon.id);
  }

  /**
   * Muestra la nómina que generó el renglón en un modal de **solo lectura**,
   * sin salir de la programación, como el ERP anterior: cabecera y conceptos,
   * sin acciones. Lazy: el modal solo se usa con la programación generada.
   */
  private verNomina(renglonId: number): void {
    from(import('../nomina-resumen-modal/nomina-resumen-modal.component'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ NominaResumenModalComponent }) => {
        this.dialog.open(NominaResumenModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '84rem',
          data: { renglonId },
        });
      });
  }

  /**
   * Abre el ajuste del renglón (lazy: el modal es pesado y solo se usa en
   * borrador) y recarga la página si guardó.
   */
  private abrirEdicion(renglonId: number): void {
    from(import('../editar-renglon-modal/editar-renglon-modal.component'))
      .pipe(
        switchMap(({ EditarRenglonModalComponent }) => {
          const ref = this.dialog.open(EditarRenglonModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '52rem',
            data: { renglonId, pagoTipoId: this.pagoTipoId() },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((guardo: unknown): guardo is true => guardo === true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.loadPage(this.currentPage()));
  }

  /** Pide confirmación y elimina los renglones seleccionados. */
  protected removeSelected(): void {
    const ids = this.selectedRows().map((r) => r.id);
    if (ids.length === 0 || this.isBusy()) return;

    const labels = this.t().entities.programacion.renglones;
    this.confirmation.confirm({
      header: labels.confirmEliminar.header,
      message: labels.confirmEliminar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(ids),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Trae los contratos del grupo como renglones.
   *
   * Si ya había renglones cargados, confirma: el backend puede estar
   * reemplazándolos y con eso se irían los ajustes de horas hechos a mano.
   */
  private cargarContratos(): void {
    if (this.totalCount() === 0) {
      this.ejecutarCarga();
      return;
    }
    const labels = this.t().entities.programacion.renglones;
    this.confirmation.confirm({
      header: labels.confirmRecargar.header,
      message: labels.confirmRecargar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.cargarContratos,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ejecutarCarga(),
    });
  }

  private ejecutarCarga(): void {
    this.isBusy.set(true);
    const toasts = this.t().entities.programacion.renglones.toasts;
    this.service
      .cargarContratos(this.programacionId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isBusy.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.toast.success(
            toasts.cargarSuccess.title,
            `${res.contratos} ${toasts.cargarSuccess.desc}`,
          );
          this.selectedRows.set([]);
          this.loadPage(0);
        },
        error: () => this.toast.error(toasts.cargarError.title, toasts.cargarError.desc),
      });
  }

  private eliminar(ids: readonly number[]): void {
    this.isBusy.set(true);
    this.service
      .eliminarRenglones(this.programacionId(), ids)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isBusy.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(
            this.t().common.toasts.deleteSuccess.title,
            this.t().common.toasts.deleteSuccess.desc,
          );
          this.selectedRows.set([]);
          this.loadPage(0);
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          ),
      });
  }

  /**
   * Las tres exportaciones comparten forma: endpoint, serializador y el filtro que
   * las acota a esta programación (ver `PROGRAMACION_EXPORTS`).
   */
  private exportar(clave: ProgramacionExportKey): void {
    const config = PROGRAMACION_EXPORTS[clave];
    const toasts = this.t().common.toasts;
    this.fileDownload
      .download(config.url, {
        method: 'POST',
        body: cuerpoExportacion(clave, this.programacionId()),
        fallbackFilename: config.archivo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toast.error(toasts.exportError.title, toasts.exportError.desc),
      });
  }

  private loadPage(page: number): void {
    const id = this.programacionId();
    if (!id) return;
    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .listarRenglones(id, page, this.pageSize, this.activeFilters())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results);
          this.totalCount.set(response.count);
          this.totalChange.emit(response.count);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          this.totalChange.emit(0);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }
}
