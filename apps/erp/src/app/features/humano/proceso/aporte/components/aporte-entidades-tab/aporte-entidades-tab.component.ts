import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { I18nService, ToastService, formatCop } from '@reddoc/core';
import { DataToolbarComponent } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { EXCEL_ACTION_PREFIX, excelAction } from '../../aporte.constants';
import { agruparEntidades } from '../../aporte.entidades';
import type { AporteEntidad } from '../../aporte.model';
import { AporteService, type AporteExportKey } from '../../aporte.service';

/**
 * Lo que se le paga a cada **entidad**, agrupado por subsistema con subtotal y
 * total general.
 *
 * Tiene tabla propia y no `<lib-data-table>` porque lo que se muestra no es una
 * lista plana sino un reporte con filas de subtotal — y porque **no se pagina**:
 * las cifras se calculan sobre el conjunto completo (ver `agruparEntidades`). Un
 * aporte tiene decenas de entidades, no miles.
 */
@Component({
  selector: 'app-aporte-entidades-tab',
  standalone: true,
  imports: [DataToolbarComponent],
  templateUrl: './aporte-entidades-tab.component.html',
})
export class AporteEntidadesTabComponent {
  private readonly service = inject(AporteService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly aporteId = input.required<number>();

  /** Cambiar el número fuerza una recarga (lo usa el workspace tras generar). */
  readonly reloadToken = input<number>(0);

  protected readonly isLoading = signal(false);
  private readonly entidades = signal<readonly AporteEntidad[]>([]);

  protected readonly agrupado = computed(() => agruparEntidades(this.entidades()));
  protected readonly isEmpty = computed(() => this.agrupado().grupos.length === 0);

  protected readonly formatMoney = formatCop;

  /** "Excel ▾" de la tabla: exporta la cotización por entidad. */
  protected readonly trailingActions = excelAction('entidades');

  constructor() {
    effect(() => {
      this.aporteId();
      this.reloadToken();
      this.load();
    });
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId.startsWith(EXCEL_ACTION_PREFIX)) {
      this.exportar(actionId.slice(EXCEL_ACTION_PREFIX.length) as AporteExportKey);
    }
  }

  private exportar(clave: AporteExportKey): void {
    const toasts = this.t().common.toasts;
    this.service
      .exportar(clave, this.aporteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toast.error(toasts.exportError.title, toasts.exportError.desc),
      });
  }

  private load(): void {
    const id = this.aporteId();
    if (!id) return;
    this.isLoading.set(true);
    this.service
      .listarEntidades(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => this.entidades.set(response.results),
        error: () => {
          this.entidades.set([]);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }
}
