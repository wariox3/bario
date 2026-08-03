import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { I18nService, ToastService, type FilterCondition } from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { APORTE_DETALLES_PAGE_SIZE, APORTE_DETALLE_FILTER_FIELDS } from '../../aporte.constants';
import { APORTE_DETALLE_ABREVIATURAS, APORTE_DETALLE_COLUMNS } from '../../aporte.detalles';
import type { AporteDetalle } from '../../aporte.model';
import { AporteService } from '../../aporte.service';

/**
 * Las **líneas liquidadas** del aporte: el desglose PILA de cada contrato.
 *
 * Solo lectura. Las fabrica el backend al generar y no se ajustan: el ERP
 * anterior dejó a medias un formulario de edición (`actualizarDetalles`) que
 * ninguna pantalla llegó a usar.
 *
 * Son 42 columnas con encabezados abreviados y scroll horizontal, tal como en el
 * ERP anterior, porque es la tabla que se compara contra el plano del operador.
 * Las abreviaturas se explican en la leyenda, que sale de la misma metadata que
 * los encabezados (ver `aporte.detalles.ts`).
 */
@Component({
  selector: 'app-aporte-detalles-tab',
  standalone: true,
  imports: [DataFilterModalComponent, DataTableComponent, DataToolbarComponent],
  templateUrl: './aporte-detalles-tab.component.html',
})
export class AporteDetallesTabComponent {
  private readonly service = inject(AporteService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly aporteId = input.required<number>();

  /** Cambiar el número fuerza una recarga (lo usa el workspace tras generar). */
  readonly reloadToken = input<number>(0);

  protected readonly items = signal<readonly AporteDetalle[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);

  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);

  protected readonly pageSize = APORTE_DETALLES_PAGE_SIZE;
  protected readonly columns = APORTE_DETALLE_COLUMNS;
  protected readonly filterFields = APORTE_DETALLE_FILTER_FIELDS;

  /** Abreviaturas con sus textos ya resueltos, para la leyenda. */
  protected readonly abreviaturas = computed(() =>
    APORTE_DETALLE_ABREVIATURAS.map(({ siglaKey, nombreKey }) => ({
      sigla: this.i18n.translate(siglaKey),
      nombre: this.i18n.translate(nombreKey),
    })),
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

  // ── Internos ──────────────────────────────────────────────────────────────

  private loadPage(page: number): void {
    const id = this.aporteId();
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
