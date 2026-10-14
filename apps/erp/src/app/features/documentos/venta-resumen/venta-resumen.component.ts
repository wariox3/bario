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
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import {
  formatCop,
  fromIsoDate,
  I18nService,
  startOfToday,
  toFiniteNumber,
  toIsoDate,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { VentaPeriodo, VentaResumen } from './venta-resumen.model';
import { VentaResumenService } from './venta-resumen.service';

type Estado = 'cargando' | 'listo' | 'error';

/** El punto del período en el que estamos hoy, y los que todavía no llegan. */
type Tramo = 'pasado' | 'hoy' | 'futuro';

/**
 * Gráfica de ventas del mes o del año en curso, con su total y su selector de
 * período. La comparten el inicio de General y el de Venta.
 *
 * El host es `display: contents` para que la card caiga directo en la grilla
 * del inicio y ocupe todo su ancho (`lg:col-span-4`).
 *
 * Signatura de la gráfica: la serie **se corta en hoy**. El backend manda los
 * días que aún no pasan en cero, pero un cero ahí no es "no vendí", es "todavía
 * no llega": esos puntos van como hueco, y el rótulo del día (o mes) en curso se
 * marca en navy para que se lea dónde está parado el período.
 */
@Component({
  selector: 'app-venta-resumen',
  standalone: true,
  imports: [ChartModule],
  templateUrl: './venta-resumen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class VentaResumenComponent {
  private readonly service = inject(VentaResumenService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly document = inject(DOCUMENT);
  protected readonly t = this.i18n.t;

  protected readonly periodos: readonly VentaPeriodo[] = ['mes', 'anio'];

  /** Arranca en el mes: es lo que se mira a diario. */
  protected readonly periodo = signal<VentaPeriodo>('mes');

  protected readonly estado = signal<Estado>('cargando');
  protected readonly resumen = signal<VentaResumen | null>(null);

  protected readonly formatMoney = formatCop;

  /** Recargando con datos ya pintados: se atenúan en vez de volver al esqueleto. */
  protected readonly recargando = computed(
    () => this.estado() === 'cargando' && this.resumen() !== null,
  );

  private readonly locale = computed(() => (this.i18n.lang() === 'en' ? 'en-US' : 'es-CO'));

  private readonly paleta = this.leerPaleta();

  /** Rótulo del período en la cabecera: `octubre de 2026` / `2026`. */
  protected readonly rotuloPeriodo = computed(() => {
    const r = this.resumen();
    const desde = fromIsoDate(r?.fecha_desde);
    if (!r || !desde) return '';
    if (r.periodo === 'anio') return String(desde.getFullYear());
    return new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(desde);
  });

  protected readonly sinVentas = computed(() => (this.resumen()?.totales.documentos ?? 0) <= 0);

  // ── Gráfica ─────────────────────────────────────────────────────────────

  /** Tramo de cada punto respecto de hoy. Comparación ISO: lexicográfica. */
  private readonly tramos = computed<readonly Tramo[]>(() => {
    const r = this.resumen();
    if (!r) return [];
    const hoy = toIsoDate(startOfToday());
    // En el año cada punto es un mes: se compara `AAAA-MM`.
    const clave = (iso: string): string => (r.periodo === 'anio' ? iso.slice(0, 7) : iso);
    const actual = clave(hoy);
    return r.serie.map((p) => {
      const k = clave(p.fecha);
      return k === actual ? 'hoy' : k > actual ? 'futuro' : 'pasado';
    });
  });

  protected readonly datosGrafica = computed<ChartData<'bar'>>(() => {
    const r = this.resumen();
    const tramos = this.tramos();
    if (!r) return { labels: [], datasets: [] };
    return {
      labels: r.serie.map((p) => this.etiquetaCorta(p.fecha, r.periodo)),
      datasets: [
        {
          label: this.t().inicio.ventaResumen.titulo,
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
    const tramos = this.tramos();
    const locale = this.locale();
    const compacto = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'COP',
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    const g = this.t().inicio.ventaResumen;
    const fuente = { family: this.paleta.fuente, size: 11 };

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: this.paleta.navy,
          titleColor: '#fff',
          bodyColor: '#fff',
          titleFont: { ...fuente, weight: 600 },
          bodyFont: { ...fuente, size: 12 },
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          // Los días que aún no llegan no tienen nada que contar.
          filter: (item: TooltipItem<'bar'>) => item.raw !== null,
          callbacks: {
            title: (items) => {
              const punto = r?.serie[items[0]?.dataIndex ?? -1];
              return punto && r ? this.etiquetaLarga(punto.fecha, r.periodo) : '';
            },
            label: (item) => formatCop(item.raw, locale),
            afterLabel: (item) => {
              const n = r?.serie[item.dataIndex]?.documentos ?? 0;
              return `${n} ${n === 1 ? g.documento : g.documentos}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: this.paleta.linea },
          ticks: {
            font: (ctx) => ({ ...fuente, weight: tramos[ctx.index] === 'hoy' ? 700 : 400 }),
            color: (ctx) =>
              tramos[ctx.index] === 'hoy'
                ? this.paleta.navy
                : tramos[ctx.index] === 'futuro'
                  ? this.paleta.tenue
                  : this.paleta.muted,
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 6,
          },
        },
        y: {
          beginAtZero: true,
          grace: '8%',
          grid: { color: this.paleta.linea },
          border: { display: false },
          ticks: {
            font: fuente,
            color: this.paleta.muted,
            maxTicksLimit: 5,
            padding: 8,
            callback: (value) => compacto.format(Number(value)),
          },
        },
      },
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

  /** Rótulo del eje: el número del día o el mes abreviado (`oct`). */
  private etiquetaCorta(iso: string, periodo: VentaPeriodo): string {
    const fecha = fromIsoDate(iso);
    if (!fecha) return '';
    if (periodo === 'mes') return String(fecha.getDate());
    return new Intl.DateTimeFormat(this.locale(), { month: 'short' })
      .format(fecha)
      .replace('.', '');
  }

  /** Rótulo del tooltip: `14 de octubre` / `octubre de 2026`. */
  private etiquetaLarga(iso: string, periodo: VentaPeriodo): string {
    const fecha = fromIsoDate(iso);
    if (!fecha) return '';
    const opciones: Intl.DateTimeFormatOptions =
      periodo === 'mes' ? { day: 'numeric', month: 'long' } : { month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat(this.locale(), opciones).format(fecha);
  }

  /**
   * Chart.js pinta en canvas y no ve las clases de Tailwind: los tokens de marca
   * se leen de las CSS vars del tema, con fallback a sus valores.
   */
  private leerPaleta() {
    const raiz = this.document.documentElement;
    const estilos = getComputedStyle(raiz);
    const leer = (nombre: string, fallback: string): string =>
      estilos.getPropertyValue(nombre).trim() || fallback;
    return {
      navy: leer('--color-brand-navy', '#13263c'),
      muted: leer('--color-brand-muted', '#7a8fa3'),
      // Las barras van en navy a media tinta: el sólido queda para el hover.
      barra: 'rgba(20, 48, 73, 0.72)',
      // El día en curso, en el sky de marca: el único acento de la gráfica.
      acento: '#77aad7',
      tenue: 'rgba(20, 48, 73, 0.25)',
      linea: 'rgba(20, 48, 73, 0.06)',
      fuente: getComputedStyle(this.document.body).fontFamily,
    };
  }
}
