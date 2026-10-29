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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize, type Subscription } from 'rxjs';
import { I18nService, ToastService } from '@reddoc/core';
import { DataTableComponent, type PageChangeEvent } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { INCONSISTENCIA_COLUMNS } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.constants';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';
import { InconsistenciaService } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.service';
import type { Periodo } from '../../periodo.model';

/**
 * Diálogo **Inconsistencias** de un periodo, desde el menú del mes en el master.
 *
 * Muestra lo guardado del periodo (`inconsistencia/lista/`), paginado, con las
 * mismas columnas que la utilidad Inconsistencias, y en el pie ofrece el Excel.
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
  imports: [ButtonModule, DataTableComponent, DialogModule],
  templateUrl: './periodo-inconsistencias-dialog.component.html',
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly columns = INCONSISTENCIA_COLUMNS;

  protected readonly items = signal<readonly InconsistenciaGuardada[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly isExporting = signal(false);

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
