import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, finalize, from, switchMap } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { I18nService, ToastService, type FilterCondition, type ListQuery } from '@reddoc/core';
import {
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
  type RowAction,
  type RowActionInvokedEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import { AdicionalService } from '@erp/features/humano/masters/adicional/adicional.service';
import type { Adicional } from '@erp/features/humano/masters/adicional/adicional.model';
import type { AppDict } from '@erp/i18n';
import { ADICIONALES_PROGRAMACION_COLUMNS } from '../../programacion.constants';
import type { CapacidadesProgramacion } from '../../programacion.estado';

/**
 * Los **conceptos adicionales** del periodo: pagos o descuentos extra que se
 * suman a la liquidación de un empleado concreto.
 *
 * No es una entidad nueva: es el master `humano/adicional` acotado a esta
 * programación, así que **reusa `AdicionalService`** en vez de duplicar el
 * transporte. El filtro por programación se inyecta como condición de la consulta.
 *
 * Como el resto del workspace, obedece las capacidades: con la programación
 * generada la pestaña queda de solo consulta.
 */
@Component({
  selector: 'app-programacion-adicionales-tab',
  standalone: true,
  imports: [ConfirmDialogModule, DataTableComponent, DataToolbarComponent],
  providers: [ConfirmationService, DialogService],
  templateUrl: './programacion-adicionales-tab.component.html',
})
export class ProgramacionAdicionalesTabComponent {
  private readonly service = inject(AdicionalService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly programacionId = input.required<number>();
  readonly capacidades = input.required<CapacidadesProgramacion>();
  readonly reloadToken = input<number>(0);

  protected readonly items = signal<readonly Adicional[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly selectedRows = signal<readonly Adicional[]>([]);
  protected readonly isBusy = signal(false);

  protected readonly columns = ADICIONALES_PROGRAMACION_COLUMNS;

  protected readonly hasSelection = computed(() => this.selectedRows().length > 0);

  protected readonly selectionMode = computed<'none' | 'multiple'>(() =>
    this.capacidades().puedeGestionarAdicionales ? 'multiple' : 'none',
  );

  protected readonly rowActions = computed<readonly RowAction[]>(() =>
    this.capacidades().puedeGestionarAdicionales
      ? [{ id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true }]
      : [],
  );

  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.capacidades().puedeGestionarAdicionales && !this.isBusy()
      ? { id: 'new', labelKey: 'common.actions.new', iconClass: 'pi pi-plus' }
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
    this.pageSize.set(event.pageSize);
    this.loadPage(event.page);
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as Adicional[]);
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'new') this.abrirModal(null);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId === 'edit') this.abrirModal(event.row as Adicional);
  }

  protected removeSelected(): void {
    const ids = this.selectedRows().map((a) => a.id);
    if (ids.length === 0 || this.isBusy()) return;

    this.confirmation.confirm({
      header: this.t().common.confirms.deleteHeader,
      message: this.t().common.confirms.deleteMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(ids),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** Abre el alta (con `null`) o la edición de un adicional; recarga si guardó. */
  private abrirModal(adicional: Adicional | null): void {
    from(import('../adicional-modal/adicional-modal.component'))
      .pipe(
        switchMap(({ AdicionalModalComponent }) => {
          const ref = this.dialog.open(AdicionalModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '44rem',
            data: { programacionId: this.programacionId(), adicional },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((guardo: unknown): guardo is true => guardo === true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.loadPage(adicional ? this.currentPage() : 0));
  }

  private eliminar(ids: readonly number[]): void {
    this.isBusy.set(true);
    this.service
      .remove(ids)
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

    // El acote a la programación viaja como filtro de la consulta: así se reusa el
    // `list` del master sin tocarlo.
    const filters: readonly FilterCondition[] = [
      { field: 'programacion', operator: 'eq', value: id },
    ];
    const query: ListQuery = { filters, sort: [], page, pageSize: this.pageSize() };

    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .list(query)
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
