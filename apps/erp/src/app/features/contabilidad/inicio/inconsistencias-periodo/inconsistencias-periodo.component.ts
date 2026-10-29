import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, type Subscription } from 'rxjs';
import { I18nService, TenantService } from '@reddoc/core';
import { DataTableComponent, type PageChangeEvent } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { INCONSISTENCIA_COLUMNS } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.constants';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';
import { InconsistenciaService } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.service';
import { periodoIdDe } from '@erp/features/contabilidad/masters/periodo/periodo.utils';

/**
 * Inconsistencias del mes en curso en el inicio de Contabilidad, bajo el estado
 * de resultados: lo guardado por el último `analizar` o `bloquear` del periodo
 * (`inconsistencia/lista/`), paginado y con las columnas de la utilidad.
 *
 * Solo aparece si el periodo tiene alguna; si la consulta falla tampoco, como
 * el aviso de pendientes. Aquí no se analiza ni se resuelve: eso se hace en la
 * utilidad Inconsistencias, a la que lleva el enlace del pie.
 *
 * El host es `display: contents` para que la card caiga directo en la grilla
 * del inicio y ocupe todo su ancho.
 */
@Component({
  selector: 'app-inconsistencias-periodo',
  standalone: true,
  imports: [DataTableComponent, RouterLink],
  templateUrl: './inconsistencias-periodo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class InconsistenciasPeriodoComponent {
  private readonly service = inject(InconsistenciaService);
  private readonly tenant = inject(TenantService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  protected readonly columns = INCONSISTENCIA_COLUMNS;

  private readonly hoy = new Date();
  private readonly periodoId = periodoIdDe(this.hoy);

  protected readonly items = signal<readonly InconsistenciaGuardada[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly currentPage = signal(0);
  protected readonly isLoading = signal(false);

  private carga: Subscription | null = null;

  /** `Octubre 2026 · 3 encontradas`: de qué periodo son y cuántas. */
  protected readonly subtitulo = computed(() => {
    const t = this.t();
    const mes = t.entities.periodo.meses[this.hoy.getMonth()] ?? '';
    const n = this.totalCount();
    const cantidad = (
      n === 1 ? t.inicio.inconsistencias.una : t.inicio.inconsistencias.varias
    ).replace('{n}', String(n));
    return `${mes} ${this.hoy.getFullYear()} · ${cantidad}`;
  });

  protected readonly utilidadLink = computed<readonly string[]>(() => {
    const slug = this.tenant.currentSlug();
    return slug ? ['/t', slug, 'contabilidad', 'utilidades', 'inconsistencias'] : [];
  });

  constructor() {
    this.cargar();
    inject(DestroyRef).onDestroy(() => this.carga?.unsubscribe());
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.cargar();
  }

  private cargar(): void {
    this.carga?.unsubscribe();
    this.isLoading.set(true);
    this.carga = this.service
      .listar(this.periodoId, this.currentPage())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.items.set(res.results ?? []);
          this.totalCount.set(res.count ?? 0);
        },
        // Un aviso que falla no se muestra: el estado de resultados queda solo.
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
        },
      });
  }
}
