import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ChartModule } from 'primeng/chart';
import type { ChartData, ChartOptions } from 'chart.js';
import { formatCop, I18nService, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PeriodoSelectorComponent } from '@erp/features/documentos/resumen-periodo/periodo-selector.component';
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
} from '@erp/features/documentos/resumen-periodo/resumen-periodo';
import type { ResultadoResumen } from './resultado-resumen.model';
import { ResultadoResumenService } from './resultado-resumen.service';

type Estado = 'cargando' | 'listo' | 'error';

/** Hover del egreso: el sky un punto más hondo, como el navy sólido del ingreso. */
const ACENTO_HOVER = '#5b93c4';

/**
 * Ingresos contra egresos del período, para el resumen del negocio de General.
 *
 * La cifra principal es el resultado (`diferencia`), en rojo solo si es
 * pérdida; debajo, ingresos y egresos con su punto de color hacen de leyenda
 * de las dos barras. Mismo corte en hoy y mismos ejes que `comercial-resumen`
 * (`resumen-periodo`); como el sky ya es el egreso, el punto en curso se marca
 * solo en su rótulo.
 *
 * El host es `display: contents` para que la card caiga directo en la grilla
 * del inicio y ocupe todo su ancho.
 */
@Component({
  selector: 'app-resultado-resumen',
  standalone: true,
  imports: [ChartModule, PeriodoSelectorComponent],
  templateUrl: './resultado-resumen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ResultadoResumenComponent {
  private readonly service = inject(ResultadoResumenService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Arranca en el mes: es lo que se mira a diario. */
  protected readonly periodo = signal<ResumenPeriodo>('mes');

  protected readonly estado = signal<Estado>('cargando');
  protected readonly resumen = signal<ResultadoResumen | null>(null);

  protected readonly formatMoney = formatCop;

  /** Recargando con datos ya pintados: se atenúan en vez de volver al esqueleto. */
  protected readonly recargando = computed(
    () => this.estado() === 'cargando' && this.resumen() !== null,
  );

  private readonly locale = computed(() => localeDe(this.i18n.lang()));

  private readonly paleta = leerPaletaGrafica(inject(DOCUMENT));

  protected readonly rotuloPeriodo = computed(() => {
    const r = this.resumen();
    return r ? rotuloPeriodo(r.fecha_desde, r.periodo, this.locale()) : '';
  });

  protected readonly perdida = computed(
    () => (toFiniteNumber(this.resumen()?.totales.diferencia) ?? 0) < 0,
  );

  protected readonly sinMovimiento = computed(() => {
    const totales = this.resumen()?.totales;
    return !toFiniteNumber(totales?.ingreso) && !toFiniteNumber(totales?.egreso);
  });

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
    const tx = this.t().inicio.resultadoResumen;
    if (!r) return { labels: [], datasets: [] };
    // `null` corta la barra: lo que aún no llega no se pinta como cero.
    const valores = (campo: 'ingreso' | 'egreso'): (number | null)[] =>
      r.serie.map((p, i) => (tramos[i] === 'futuro' ? null : (toFiniteNumber(p[campo]) ?? 0)));
    const barra = {
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: 18,
      categoryPercentage: 0.72,
      barPercentage: 0.88,
    } as const;
    return {
      labels: r.serie.map((p) => etiquetaCorta(p.fecha, r.periodo, this.locale())),
      datasets: [
        {
          ...barra,
          label: tx.ingreso,
          data: valores('ingreso'),
          backgroundColor: this.paleta.barra,
          hoverBackgroundColor: this.paleta.navy,
        },
        {
          ...barra,
          label: tx.egreso,
          data: valores('egreso'),
          backgroundColor: this.paleta.acento,
          hoverBackgroundColor: ACENTO_HOVER,
        },
      ],
    };
  });

  protected readonly opcionesGrafica = computed<ChartOptions<'bar'>>(() => {
    const r = this.resumen();
    const locale = this.locale();
    const tx = this.t().inicio.resultadoResumen;

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
            label: (item) => `${item.dataset.label}: ${formatCop(item.raw, locale)}`,
            // El resultado del día: lo que la persona busca al pasar el mouse.
            footer: (items) => {
              const punto = r?.serie[items[0]?.dataIndex ?? -1];
              if (!punto) return '';
              const diferencia =
                (toFiniteNumber(punto.ingreso) ?? 0) - (toFiniteNumber(punto.egreso) ?? 0);
              return `${tx.resultado}: ${formatCop(diferencia, locale)}`;
            },
          },
        },
      },
      scales: ejesPeriodo(this.paleta, this.tramos(), locale),
    };
  });

  constructor() {
    effect((onCleanup) => {
      const periodo = this.periodo();
      this.estado.set('cargando');
      const sub = this.service.obtener(periodo).subscribe({
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
