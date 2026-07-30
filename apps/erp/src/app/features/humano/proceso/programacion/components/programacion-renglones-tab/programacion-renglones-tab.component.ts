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
import { Router } from '@angular/router';
import { EMPTY, filter, finalize, from, switchMap } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import {
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
import { PROGRAMACION_RENGLONES_PAGE_SIZE } from '../../programacion.constants';
import { columnasDeRenglones, muestraHoras } from '../../programacion.renglones';
import { ProgramacionService } from '../../programacion.service';

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
  imports: [ConfirmDialogModule, DataTableComponent, DataToolbarComponent],
  providers: [ConfirmationService, DialogService],
  templateUrl: './programacion-renglones-tab.component.html',
})
export class ProgramacionRenglonesTabComponent {
  private readonly service = inject(ProgramacionService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(DialogService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
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

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'cargar-contratos') this.cargarContratos();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const renglon = event.row as ProgramacionDetalle;
    if (event.actionId === 'edit') this.abrirEdicion(renglon.id);
    if (event.actionId === 'ver-nomina') this.verNomina(renglon.id);
  }

  /**
   * Abre la nómina que generó el renglón.
   *
   * En vez de un modal que vuelva a pintar el documento —lo que hacía el ERP
   * anterior, con su propia copia de la cabecera y las líneas— se navega a la
   * **ficha del documento de nómina que ya existe** en este ERP. El renglón solo
   * conoce su propio id, así que primero se busca el documento por
   * `programacion_detalle_id`.
   */
  private verNomina(renglonId: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;

    this.service
      .nominaDelRenglon(renglonId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const documento = res.results[0];
          if (!documento) {
            const toast = this.t().entities.programacion.renglones.toasts.sinNomina;
            this.toast.warn(toast.title, toast.desc);
            return;
          }
          void this.router.navigate(['/t', slug, 'humano', 'nomina', 'detalle', documento.id]);
        },
        error: () => {
          const toast = this.t().entities.programacion.renglones.toasts.sinNomina;
          this.toast.error(toast.title, toast.desc);
        },
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
      .eliminarRenglones(ids)
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
    const id = this.programacionId();
    if (!id) return;
    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .listarRenglones(id, page + 1, this.pageSize)
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
