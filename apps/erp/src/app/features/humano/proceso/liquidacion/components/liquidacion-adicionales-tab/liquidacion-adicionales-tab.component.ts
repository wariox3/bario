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
import { I18nService, ToastService } from '@reddoc/core';
import {
  DataTableComponent,
  DataToolbarComponent,
  type RowAction,
  type RowActionInvokedEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import type { AppDict } from '@erp/i18n';
import { LIQUIDACION_ADICIONAL_COLUMNS } from '../../liquidacion.constants';
import { OPERACION, operacionDe, type Operacion } from '../../liquidacion.adicionales';
import type { CapacidadesLiquidacion } from '../../liquidacion.estado';
import type { LiquidacionAdicional } from '../../liquidacion.model';
import { LiquidacionService } from '../../liquidacion.service';

/**
 * Las **adiciones y deducciones** de la liquidación: conceptos que suman o restan
 * al total, cargados a mano.
 *
 * Son lo único de la liquidación que se toca a mano — las prestaciones las
 * calcula el backend—, y se congelan al generar: cambiarlas después movería el
 * total sin rehacer el cálculo.
 *
 * **No decide qué se puede hacer**: recibe las capacidades ya calculadas por la
 * máquina de estados y solo las obedece.
 */
@Component({
  selector: 'app-liquidacion-adicionales-tab',
  standalone: true,
  imports: [ConfirmDialogModule, DataTableComponent, DataToolbarComponent],
  providers: [ConfirmationService, DialogService],
  templateUrl: './liquidacion-adicionales-tab.component.html',
})
export class LiquidacionAdicionalesTabComponent {
  private readonly service = inject(LiquidacionService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly liquidacionId = input.required<number>();

  /** Capacidades ya resueltas por `capacidadesDe`. */
  readonly capacidades = input.required<CapacidadesLiquidacion>();

  /** Cambiar el número fuerza una recarga (lo usa el workspace tras generar). */
  readonly reloadToken = input<number>(0);

  /**
   * Los adicionales cambiaron. El workspace recarga la cabecera: `adicion`,
   * `deduccion` y `total` los recalcula el backend.
   */
  readonly cambio = output<void>();

  protected readonly items = signal<readonly LiquidacionAdicional[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly selectedRows = signal<readonly LiquidacionAdicional[]>([]);
  protected readonly isBusy = signal(false);

  protected readonly columns = LIQUIDACION_ADICIONAL_COLUMNS;

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  /** Selección múltiple solo si se puede eliminar. */
  protected readonly selectionMode = computed<'none' | 'multiple'>(() =>
    this.capacidades().puedeGestionarAdicionales ? 'multiple' : 'none',
  );

  /**
   * Editar solo en borrador. Al reabrir, la operación se deduce del registro
   * (`operacionDe`) para acotar el catálogo igual que al crearlo.
   */
  protected readonly rowActions = computed<readonly RowAction[]>(() =>
    this.capacidades().puedeGestionarAdicionales
      ? [{ id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true }]
      : [],
  );

  /**
   * Las dos altas. Van como acción primaria y acción trailing porque el toolbar
   * compartido admite una sola primaria; la adición es la más frecuente.
   */
  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.capacidades().puedeGestionarAdicionales && !this.isBusy()
      ? {
          id: 'nueva-adicion',
          labelKey: 'entities.liquidacion.adicionales.nuevaAdicion',
          iconClass: 'pi pi-plus',
        }
      : null,
  );

  protected readonly trailingActions = computed<readonly ToolbarAction[]>(() =>
    this.capacidades().puedeGestionarAdicionales && !this.isBusy()
      ? [
          {
            id: 'nueva-deduccion',
            labelKey: 'entities.liquidacion.adicionales.nuevaDeduccion',
            iconClass: 'pi pi-minus',
          },
        ]
      : [],
  );

  constructor() {
    effect(() => {
      this.liquidacionId();
      this.reloadToken();
      this.load();
    });
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as LiquidacionAdicional[]);
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'nueva-adicion') this.abrirModal(OPERACION.ADICIONA);
    if (actionId === 'nueva-deduccion') this.abrirModal(OPERACION.DEDUCE);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'edit') return;
    const adicional = event.row as LiquidacionAdicional;
    this.abrirModal(operacionDe(adicional), adicional.id);
  }

  /** Pide confirmación y elimina los adicionales seleccionados. */
  protected removeSelected(): void {
    const ids = this.selectedRows().map((fila) => fila.id);
    if (ids.length === 0 || this.isBusy()) return;

    const labels = this.t().entities.liquidacion.adicionales;
    this.confirmation.confirm({
      header: labels.confirmEliminar.header,
      message: labels.confirmEliminar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.eliminar(ids),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** Abre el modal (lazy) y recarga si guardó. */
  private abrirModal(operacion: Operacion, adicionalId?: number): void {
    from(import('../adicional-modal/adicional-modal.component'))
      .pipe(
        switchMap(({ AdicionalModalComponent }) => {
          const ref = this.dialog.open(AdicionalModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '44rem',
            data: { liquidacionId: this.liquidacionId(), operacion, adicionalId },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((guardo: unknown): guardo is true => guardo === true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refrescar());
  }

  /**
   * Elimina en **una sola tanda**: una petición por id, un refresco y un toast al
   * final. El ERP anterior además recargaba fuera del `subscribe`, así que pedía
   * los datos antes de que terminaran los DELETE.
   */
  private eliminar(ids: readonly number[]): void {
    this.isBusy.set(true);
    this.service
      .eliminarAdicionales(ids)
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
          this.refrescar();
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          ),
      });
  }

  /** Recarga la tabla y avisa al workspace, que tiene que releer los totales. */
  private refrescar(): void {
    this.selectedRows.set([]);
    this.load();
    this.cambio.emit();
  }

  private load(): void {
    const id = this.liquidacionId();
    if (!id) return;
    this.isLoading.set(true);
    this.service
      .listarAdicionales(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => this.items.set(response.results),
        error: () => {
          this.items.set([]);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }
}
