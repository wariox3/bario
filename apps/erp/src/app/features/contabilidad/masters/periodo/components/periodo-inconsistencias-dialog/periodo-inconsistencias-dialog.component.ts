import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { finalize, type Subscription } from 'rxjs';
import { I18nService, LIST_PAGE_SIZE, ToastService } from '@reddoc/core';
import {
  DataTableComponent,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import {
  ACCION_RESOLVER,
  INCONSISTENCIA_COLUMNS,
  ROW_ACTIONS,
} from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.constants';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';
import { InconsistenciaService } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.service';
import type { Periodo } from '../../periodo.model';

/**
 * Diálogo **Inconsistencias** de un periodo, desde el menú del mes en el master.
 *
 * Muestra lo guardado del periodo (`inconsistencia/lista/`), paginado, con las
 * mismas columnas que la utilidad Inconsistencias, y en el pie ofrece el Excel.
 * Las filas que el backend sabe corregir solo traen el botón Resolver, como en
 * la utilidad; tras resolver se recarga la página de la lista.
 * Es lo que encendió el triángulo del mes: `bloquear` y `analizar` guardan el
 * análisis y `estado_inconsistencia`. No vuelve a analizar: para eso está la
 * utilidad.
 *
 * Mismo chrome que `contabilidad-dialog`. La lista se pide al abrir y se vacía
 * al cerrar, para que la próxima apertura no muestre el periodo anterior
 * mientras llega la respuesta.
 *
 * ```html
 * <app-periodo-inconsistencias-dialog [(visible)]="visible" [periodo]="periodo()" />
 * ```
 */
@Component({
  selector: 'app-periodo-inconsistencias-dialog',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, DataTableComponent, DialogModule],
  templateUrl: './periodo-inconsistencias-dialog.component.html',
  providers: [ConfirmationService],
  styleUrl: './periodo-inconsistencias-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodoInconsistenciasDialogComponent {
  /** Visibilidad del diálogo (two-way: `[(visible)]`). */
  readonly visible = model<boolean>(false);

  /** Periodo cuyas inconsistencias se muestran. */
  readonly periodo = input<Periodo | null>(null);

  private readonly service = inject(InconsistenciaService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly columns = INCONSISTENCIA_COLUMNS;
  protected readonly rowActions = ROW_ACTIONS;

  protected readonly items = signal<readonly InconsistenciaGuardada[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly isExporting = signal(false);
  /** Resolver en curso: no se acepta otra ni se cierra el diálogo. */
  protected readonly isResolving = signal(false);

  private carga: Subscription | null = null;

  /** `Octubre 2026`: el subtítulo dice de qué periodo son. */
  protected readonly nombrePeriodo = computed(() => {
    const p = this.periodo();
    if (!p) return '';
    return `${this.t().entities.periodo.meses[p.mes - 1] ?? p.mes} ${p.anio}`;
  });

  constructor() {
    // Depende solo de `visible` y `periodo`: `untracked` deja afuera lo que lee
    // `cargar`, para que paginar no vuelva a disparar el efecto.
    effect(() => {
      const abierto = this.visible();
      const periodo = this.periodo();
      untracked(() => {
        this.currentPage.set(0);
        if (abierto && periodo) {
          this.cargar(periodo.id);
        } else {
          this.carga?.unsubscribe();
          this.items.set([]);
          this.totalCount.set(0);
        }
      });
    });
    this.destroyRef.onDestroy(() => this.carga?.unsubscribe());
  }

  protected onPageChange(event: PageChangeEvent): void {
    const periodo = this.periodo();
    if (!periodo) return;
    this.currentPage.set(event.page);
    this.cargar(periodo.id);
  }

  /** Descarga el Excel de todo lo guardado del periodo; solo bloquea su botón. */
  protected exportarExcel(): void {
    const periodo = this.periodo();
    if (!periodo || this.isExporting()) return;
    this.isExporting.set(true);
    this.service
      .exportarExcel(periodo.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isExporting.set(false)),
      )
      .subscribe({
        error: () => {
          const toast = this.t().common.toasts.exportError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== ACCION_RESOLVER || this.isResolving()) return;
    const fila = event.row as InconsistenciaGuardada;
    const dict = this.t().entities.inconsistencias.resolver;
    this.confirmation.confirm({
      header: dict.confirm.header,
      icon: 'pi pi-info-circle',
      message: dict.confirm.message
        .replace('{tipo}', fila.inconsistencia_tipo_nombre)
        .replace('{descripcion}', fila.descripcion),
      acceptLabel: dict.confirm.accept,
      rejectLabel: dict.confirm.cancel,
      acceptIcon: 'pi pi-wrench',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.resolver(fila),
    });
  }

  private resolver(fila: InconsistenciaGuardada): void {
    const periodo = this.periodo();
    if (!periodo) return;
    const dict = this.t().entities.inconsistencias.resolver;
    this.isResolving.set(true);
    // El error lo avisa el interceptor con el mensaje del backend.
    this.service
      .resolver(fila.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isResolving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(dict.toast.title, dict.toast.desc);
          // Si era la única de la última página, esa página ya no existe.
          const ultima = Math.max(Math.ceil((this.totalCount() - 1) / LIST_PAGE_SIZE) - 1, 0);
          this.currentPage.set(Math.min(this.currentPage(), ultima));
          this.cargar(periodo.id);
        },
      });
  }

  private cargar(periodoId: number): void {
    this.carga?.unsubscribe();
    this.isLoading.set(true);
    this.carga = this.service
      .listar(periodoId, this.currentPage())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.items.set(res.results ?? []);
          this.totalCount.set(res.count ?? 0);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          const toast = this.t().entities.periodo.inconsistencias.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }
}
