import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ChartModule } from 'primeng/chart';
import type { ChartData, ChartOptions } from 'chart.js';
import { formatCop, I18nService, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PeriodoSelectorComponent } from '../resumen-periodo/periodo-selector.component';
import {
  ejesPeriodo,
  etiquetaCorta,
  etiquetaLarga,
  leerPaletaGrafica,
  localeDe,
  rotuloPeriodo,
  tooltipBase,
  tramosDe,
  type ResumenPeriodo,
} from '../resumen-periodo/resumen-periodo';
import type { ComercialResumen, ComercialTipo } from './comercial-resumen.model';
import { ComercialResumenService } from './comercial-resumen.service';

type Estado = 'cargando' | 'listo' | 'error';

/**
 * Gráfica de ventas o compras del mes o del año en curso, con su total y su
 * selector de período. `venta` la usa el inicio de Venta; `compra`, el de
 * Compra. Solo cambian el endpoint y los textos.
 *
 * El host es `display: contents` para que la card caiga directo en la grilla
 * del inicio y ocupe todo su ancho (`lg:col-span-4`).
 *
 * Signatura de la gráfica: la serie **se corta en hoy** (ver `tramosDe`): lo
 * que aún no llega va como hueco, y el día (o mes) en curso se pinta en sky
 * para que se lea dónde está parado el período.
 */
@Component({
  selector: 'app-comercial-resumen',
  standalone: true,
  imports: [ChartModule, PeriodoSelectorComponent],
  templateUrl: './comercial-resumen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ComercialResumenComponent {
  private readonly service = inject(ComercialResumenService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly tipo = input<ComercialTipo>('venta');

  /** Arranca en el mes: es lo que se mira a diario. */
  protected readonly periodo = signal<ResumenPeriodo>('mes');

  protected readonly estado = signal<Estado>('cargando');
  protected readonly resumen = signal<ComercialResumen | null>(null);

  protected readonly formatMoney = formatCop;

  /** Recargando con datos ya pintados: se atenúan en vez de volver al esqueleto. */
  protected readonly recargando = computed(
    () => this.estado() === 'cargando' && this.resumen() !== null,
  );

  private readonly locale = computed(() => localeDe(this.i18n.lang()));

  private readonly paleta = leerPaletaGrafica(inject(DOCUMENT));

  /** Textos que cambian según el movimiento. */
  protected readonly textos = computed(() => this.t().inicio.comercialResumen.porTipo[this.tipo()]);

  protected readonly rotuloPeriodo = computed(() => {
    const r = this.resumen();
    return r ? rotuloPeriodo(r.fecha_desde, r.periodo, this.locale()) : '';
  });

  protected readonly sinMovimiento = computed(() => (this.resumen()?.totales.documentos ?? 0) <= 0);

  private readonly tramos = computed(() => {
    const r = this.resumen();
    return r
      ? tramosDe(
          r.serie.map((p) => p.fecha),
          r.periodo,
        )
      : [];
  });

  protected readonly datosGrafica = computed<ChartData<'bar'>>(() => {
    const r = this.resumen();
    const tramos = this.tramos();
    if (!r) return { labels: [], datasets: [] };
    return {
      labels: r.serie.map((p) => etiquetaCorta(p.fecha, r.periodo, this.locale())),
      datasets: [
        {
          label: this.textos().titulo,
          // `null` corta la barra: lo que aún no llega no se pinta como cero.
          data: r.serie.map((p, i) =>
            tramos[i] === 'futuro' ? null : (toFiniteNumber(p.total) ?? 0),
          ),
          backgroundColor: tramos.map((tramo) =>
            tramo === 'hoy' ? this.paleta.acento : this.paleta.barra,
          ),
          hoverBackgroundColor: this.paleta.navy,
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 28,
          categoryPercentage: 0.72,
          barPercentage: 0.9,
        },
      ],
    };
  });

  protected readonly opcionesGrafica = computed<ChartOptions<'bar'>>(() => {
    const r = this.resumen();
    const locale = this.locale();
    const g = this.t().inicio.comercialResumen;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(this.paleta),
          callbacks: {
            title: (items) => {
              const punto = r?.serie[items[0]?.dataIndex ?? -1];
              return punto && r ? etiquetaLarga(punto.fecha, r.periodo, locale) : '';
            },
            label: (item) => formatCop(item.raw, locale),
            afterLabel: (item) => {
              const n = r?.serie[item.dataIndex]?.documentos ?? 0;
              return `${n} ${n === 1 ? g.documento : g.documentos}`;
            },
          },
        },
      },
      scales: ejesPeriodo(this.paleta, this.tramos(), locale),
    };
  });

  constructor() {
    effect((onCleanup) => {
      const tipo = this.tipo();
      const periodo = this.periodo();
      this.estado.set('cargando');
      const sub = this.service.obtener(tipo, periodo).subscribe({
        next: (res) => {
          this.resumen.set(res);
          this.estado.set('listo');
        },
        // Lo pintado es de otro período: mostrarlo bajo el selector nuevo mentiría.
        error: () => {
          this.resumen.set(null);
          this.estado.set('error');
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
