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
import { EMPTY, finalize, from, switchMap } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { I18nService, ToastService, type FilterCondition } from '@reddoc/core';
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
import type { CapacidadesAporte } from '../../aporte.estado';
import { conNovedad, type AporteContratoFila } from '../../aporte.contratos';
import {
  APORTE_CONTRATOS_PAGE_SIZE,
  APORTE_CONTRATO_COLUMNS,
  APORTE_CONTRATO_FILTER_FIELDS,
} from '../../aporte.constants';
import { AporteService } from '../../aporte.service';

/**
 * Los **contratos** incluidos en el aporte: quién entra en la planilla del
 * periodo.
 *
 * Las filas las trae el backend ("Cargar contratos"); desde acá se consultan, se
 * filtran, se seleccionan y se eliminan. Cada fila lleva su `novedad` derivada
 * (ver `aporte.contratos.ts`), que es lo que avisa de un ingreso, un retiro o una
 * terminación que hay que revisar antes de generar.
 *
 * **No decide qué se puede hacer**: recibe las capacidades ya calculadas por la
 * máquina de estados y solo las obedece.
 */
@Component({
  selector: 'app-aporte-contratos-tab',
  standalone: true,
  imports: [
    ConfirmDialogModule,
    DataFilterModalComponent,
    DataTableComponent,
    DataToolbarComponent,
  ],
  providers: [ConfirmationService, DialogService],
  templateUrl: './aporte-contratos-tab.component.html',
})
export class AporteContratosTabComponent {
  private readonly service = inject(AporteService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly aporteId = input.required<number>();

  /** Periodo del aporte: acota el cruce contra las nóminas liquidadas. */
  readonly fechaDesde = input<string | null>(null);
  readonly fechaHasta = input<string | null>(null);

  /** Capacidades ya resueltas por `capacidadesDe`. */
  readonly capacidades = input.required<CapacidadesAporte>();

  /** Cambiar el número fuerza una recarga (lo usa el workspace tras generar). */
  readonly reloadToken = input<number>(0);

  /**
   * Cuántos contratos hay. El workspace lo necesita para decidir si se puede
   * generar (`capacidadesDe` exige contratos), así que el conteo sube.
   */
  readonly totalChange = output<number>();

  protected readonly items = signal<readonly AporteContratoFila[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly selectedRows = signal<readonly AporteContratoFila[]>([]);
  protected readonly isBusy = signal(false);

  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);

  protected readonly pageSize = APORTE_CONTRATOS_PAGE_SIZE;
  protected readonly columns = APORTE_CONTRATO_COLUMNS;
  protected readonly filterFields = APORTE_CONTRATO_FILTER_FIELDS;

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /**
   * Ver de dónde sale el IBC del empleado. Siempre disponible: explicar la cifra
   * no depende de la etapa del proceso.
   */
  protected readonly rowActions: readonly RowAction[] = [
    {
      id: 'ver-nominas',
      labelKey: 'entities.aporte.trazabilidad.verNominas',
      iconClass: 'pi pi-file-check',
      inline: true,
    },
  ];

  /** Selección múltiple solo si se puede eliminar: seleccionar sin poder borrar no sirve. */
  protected readonly selectionMode = computed<'none' | 'multiple'>(() =>
    this.capacidades().puedeEliminarContrato ? 'multiple' : 'none',
  );

  /**
   * "Cargar contratos" es la acción destacada. Se ofrece solo en borrador; el
   * toolbar la oculta cuando no hay ninguna.
   */
  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.capacidades().puedeCargarContratos && !this.isBusy()
      ? {
          id: 'cargar-contratos',
          labelKey: 'entities.aporte.contratos.cargarContratos',
          iconClass: 'pi pi-download',
        }
      : null,
  );

  constructor() {
    effect(() => {
      this.aporteId();
      this.reloadToken();
      this.loadPage(0);
    });
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.loadPage(event.page);
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as AporteContratoFila[]);
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'cargar-contratos') this.cargarContratos();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId === 'ver-nominas') this.verNominas(event.row as AporteContratoFila);
  }

  /**
   * Abre el cruce contra las nóminas del contrato (lazy: el modal solo se usa
   * cuando alguien pregunta por una cifra). Se le pasa el **contrato del
   * empleado**, no el id del renglón del aporte.
   */
  private verNominas(fila: AporteContratoFila): void {
    if (fila.contrato == null) return;
    from(import('../nominas-contrato-modal/nominas-contrato-modal.component'))
      .pipe(
        switchMap(({ NominasContratoModalComponent }) => {
          const ref = this.dialog.open(NominasContratoModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '68rem',
            data: {
              contratoId: fila.contrato,
              empleado: fila.contrato__contacto__nombre_corto,
              fechaDesde: this.fechaDesde(),
              fechaHasta: this.fechaHasta(),
            },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.loadPage(0);
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.loadPage(0);
  }

  /** Pide confirmación y elimina los contratos seleccionados. */
  protected removeSelected(): void {
    const ids = this.selectedRows().map((fila) => fila.id);
    if (ids.length === 0 || this.isBusy()) return;

    const labels = this.t().entities.aporte.contratos;
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
   * Trae los contratos vigentes del periodo.
   *
   * Si ya había contratos cargados, confirma: el backend los reemplaza y con eso
   * se irían las exclusiones hechas a mano.
   */
  private cargarContratos(): void {
    if (this.totalCount() === 0) {
      this.ejecutarCarga();
      return;
    }
    const labels = this.t().entities.aporte.contratos;
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
    const toasts = this.t().entities.aporte.contratos.toasts;
    this.service
      .cargarContratos(this.aporteId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isBusy.set(false)),
      )
      .subscribe({
        next: (res) => {
          const cantidad = res.contratos;
          this.toast.success(
            toasts.cargarSuccess.title,
            cantidad != null
              ? `${cantidad} ${toasts.cargarSuccess.desc}`
              : toasts.cargarSuccess.desc,
          );
          this.selectedRows.set([]);
          this.loadPage(0);
        },
        error: () => this.toast.error(toasts.cargarError.title, toasts.cargarError.desc),
      });
  }

  /**
   * Elimina en **una sola tanda**: una petición por id pero un solo refresco y un
   * solo toast al final. El ERP anterior disparaba N peticiones sueltas, cada una
   * recargando la tabla y sacando su propio mensaje.
   */
  private eliminar(ids: readonly number[]): void {
    this.isBusy.set(true);
    this.service
      .eliminarContratos(ids)
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

  private loadPage(page: number): void {
    const id = this.aporteId();
    if (!id) return;
    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .listarContratos(id, page + 1, this.pageSize, this.activeFilters())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(conNovedad(response.results));
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
