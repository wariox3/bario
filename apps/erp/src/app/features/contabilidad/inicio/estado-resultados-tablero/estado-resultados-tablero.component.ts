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
import type { ChartData, ChartOptions, Plugin } from 'chart.js';
import {
  formatCop,
  formatFechaCorta,
  fromIsoDate,
  I18nService,
  toFiniteNumber,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PeriodoSelectorComponent } from '@erp/features/documentos/resumen-periodo/periodo-selector.component';
import {
  formatCopCompacto,
  leerPaletaGrafica,
  localeDe,
  RANGO_PERIODOS,
  rangoDePeriodo,
  rotuloPeriodo,
  tooltipBase,
  trimestreDe,
  type RangoPeriodo,
} from '@erp/features/documentos/resumen-periodo/resumen-periodo';
import { barrasCascada, variacionPorcentual } from './cascada';
import type {
  EstadoResultadosTablero,
  FilaCascada,
  TipoCascada,
} from './estado-resultados-tablero.model';
import { EstadoResultadosTableroService } from './estado-resultados-tablero.service';

type Estado = 'cargando' | 'listo' | 'error';

type ClaveTarjeta = 'vendimos' | 'gastamos' | 'nos_quedo';

/** Bajo este ancho de canvas los rótulos del eje X van en dos líneas. */
const ANCHO_MOVIL = 576;

/** Separación entre la barra y su etiqueta de valor, en px. */
const AIRE_ETIQUETA = 4;

/**
 * Parte un rótulo en dos líneas por el espacio más cercano a la mitad, para
 * que las ocho barras quepan en un celular sin rotar el texto.
 */
export function partirEnDosLineas(texto: string): string | string[] {
  const espacios = [...texto.matchAll(/ /g)].map((m) => m.index);
  if (!espacios.length) return texto;
  const mitad = texto.length / 2;
  const corte = espacios.reduce((a, b) => (Math.abs(b - mitad) < Math.abs(a - mitad) ? b : a));
  return [texto.slice(0, corte), texto.slice(corte + 1)];
}

/**
 * Estado de resultados del inicio de Contabilidad, para quien no lee balances:
 * cuánto vendimos, cuánto gastamos y cuánto nos quedó, y abajo la cascada que
 * lleva de una cifra a la otra.
 *
 * Las tarjetas y la leyenda comparten los cuadritos de color con las barras:
 * "Vendimos" es la primera, "Nos quedó" la última. Las salidas van en el sky de
 * marca, como el egreso de `resultado-resumen`; el rojo queda solo para la
 * pérdida, así no se gasta en un mes sano.
 *
 * El host es `display: contents` para que la card caiga directo en la grilla
 * del inicio y ocupe todo su ancho.
 */
@Component({
  selector: 'app-estado-resultados-tablero',
  standalone: true,
  imports: [ChartModule, PeriodoSelectorComponent],
  templateUrl: './estado-resultados-tablero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EstadoResultadosTableroComponent {
  private readonly service = inject(EstadoResultadosTableroService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Mes, trimestre o año en curso: el endpoint recibe fechas, así que cabe el trimestre. */
  protected readonly periodos = RANGO_PERIODOS;

  /** Arranca en el mes: es lo que se mira a diario. */
  protected readonly periodo = signal<RangoPeriodo>('mes');

  protected readonly estado = signal<Estado>('cargando');
  protected readonly resumen = signal<EstadoResultadosTablero | null>(null);
  /** El período de lo pintado: el selector cambia antes de que llegue la respuesta. */
  private readonly periodoPintado = signal<RangoPeriodo>('mes');

  protected readonly formatMoney = formatCop;

  /** Recargando con datos ya pintados: se atenúan en vez de volver al esqueleto. */
  protected readonly recargando = computed(
    () => this.estado() === 'cargando' && this.resumen() !== null,
  );

  private readonly locale = computed(() => localeDe(this.i18n.lang()));

  private readonly paleta = leerPaletaGrafica(inject(DOCUMENT));

  protected readonly rotuloPeriodo = computed(() => {
    const r = this.resumen();
    return r ? this.rotuloDe(r.fecha_desde) : '';
  });

  /** `octubre de 2026`, `trimestre 4 de 2026` o `2026`, según lo pintado. */
  private rotuloDe(fechaDesde: string): string {
    const periodo = this.periodoPintado();
    if (periodo !== 'trimestre') return rotuloPeriodo(fechaDesde, periodo, this.locale());
    const desde = fromIsoDate(fechaDesde);
    if (!desde) return '';
    return this.t()
      .inicio.estadoResultados.trimestre.replace('{n}', String(trimestreDe(desde) + 1))
      .replace('{anio}', String(desde.getFullYear()));
  }

  protected readonly fechaCorte = computed(() => formatFechaCorta(this.resumen()?.fecha_hasta, ''));

  protected readonly perdida = computed(
    () => (toFiniteNumber(this.resumen()?.tarjetas.nos_quedo) ?? 0) < 0,
  );

  /** "X de cada 100 pesos": sin ventas el backend lo manda nulo y no se muestra. */
  protected readonly margen = computed(() => {
    const margen = toFiniteNumber(this.resumen()?.tarjetas.margen_neto);
    return margen === null ? null : Math.round(margen);
  });

  protected readonly sinMovimiento = computed(
    () => this.resumen()?.cascada.every((f) => !toFiniteNumber(f.valor)) ?? true,
  );

  /** Las tres cifras de arriba, cada una contra el mismo rango del año anterior. */
  protected readonly tarjetas = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    const locale = this.locale();
    const porcentaje = new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    const vs = this.rotuloDe(r.comparativo.fecha_desde);
    const claves: readonly ClaveTarjeta[] = ['vendimos', 'gastamos', 'nos_quedo'];
    return claves.map((clave) => {
      const valor = toFiniteNumber(r.tarjetas[clave]) ?? 0;
      const variacion = variacionPorcentual(valor, toFiniteNumber(r.comparativo[clave]) ?? 0);
      return {
        clave,
        valor,
        variacion:
          variacion === null
            ? null
            : {
                sube: variacion > 0,
                baja: variacion < 0,
                texto: porcentaje.format(Math.abs(variacion) / 100),
                vs,
              },
      };
    });
  });

  private readonly barras = computed(() => barrasCascada(this.resumen()?.cascada ?? []));

  /** Rótulo de la fila por clave; el del backend solo si la clave es nueva. */
  private rotulo(fila: FilaCascada): string {
    return this.t().inicio.estadoResultados.cascada[fila.clave] ?? fila.etiqueta;
  }

  private color(tipo: TipoCascada, valor: number): { fondo: string; hover: string } {
    const p = this.paleta;
    switch (tipo) {
      case 'entrada':
        return { fondo: p.barra, hover: p.navy };
      case 'salida':
        return { fondo: p.acento, hover: p.acentoHover };
      case 'subtotal':
        return { fondo: p.muted, hover: p.muted };
      case 'total': {
        const final = valor < 0 ? p.rojo : p.verde;
        return { fondo: final, hover: final };
      }
    }
  }

  protected readonly datosGrafica = computed<ChartData<'bar'>>(() => {
    const barras = this.barras();
    const colores = barras.map((b) => this.color(b.fila.tipo, b.fin));
    return {
      labels: barras.map((b) => this.rotulo(b.fila)),
      datasets: [
        {
          data: barras.map((b) => [b.inicio, b.fin]),
          backgroundColor: colores.map((c) => c.fondo),
          hoverBackgroundColor: colores.map((c) => c.hover),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 56,
          categoryPercentage: 0.78,
          barPercentage: 0.9,
        },
      ],
    };
  });

  protected readonly opcionesGrafica = computed<ChartOptions<'bar'>>(() => {
    const barras = this.barras();
    const locale = this.locale();
    const tx = this.t().inicio.estadoResultados;
    const fuente = { family: this.paleta.fuente, size: 11 };

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false },
      // Aire arriba para la etiqueta de la barra más alta.
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(this.paleta),
          callbacks: {
            label: (item) => formatCop(barras[item.dataIndex]?.fila.valor, locale),
            // En lo que entra o sale, cómo queda la cuenta después de la barra.
            footer: (items) => {
              const barra = barras[items[0]?.dataIndex ?? -1];
              if (!barra || barra.fila.tipo === 'subtotal' || barra.fila.tipo === 'total') {
                return '';
              }
              return `${tx.leyenda.subtotal}: ${formatCop(barra.fin, locale)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: this.paleta.linea },
          ticks: {
            font: fuente,
            color: this.paleta.muted,
            maxRotation: 0,
            // Son ocho pasos de una sola cuenta: saltarse uno corta el camino.
            autoSkip: false,
            callback(value) {
              const rotulo = this.getLabelForValue(Number(value));
              return this.chart.width < ANCHO_MOVIL ? partirEnDosLineas(rotulo) : rotulo;
            },
          },
        },
        y: {
          // Con pérdida el eje baja del cero; el cero siempre queda a la vista.
          beginAtZero: true,
          grace: '10%',
          grid: { color: this.paleta.linea },
          border: { display: false },
          ticks: {
            font: fuente,
            color: this.paleta.muted,
            maxTicksLimit: 5,
            padding: 8,
            callback: (value) => formatCopCompacto(Number(value), locale),
          },
        },
      },
    };
  });

  /**
   * Etiqueta de valor sobre cada barra (bajo ella si baja) y el filete punteado
   * que une el final de una barra con el arranque de la siguiente: el camino
   * del peso se lee de izquierda a derecha sin pasar el mouse.
   */
  protected readonly plugins: Plugin<'bar'>[] = [
    {
      id: 'cascadaEtiquetas',
      afterDatasetsDraw: (chart) => {
        const barras = this.barras();
        const elementos = chart.getDatasetMeta(0).data;
        const escala = chart.scales['y'];
        if (!escala) return;
        const { ctx } = chart;
        const locale = this.locale();
        ctx.save();

        ctx.strokeStyle = this.paleta.tenue;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let i = 0; i < barras.length - 1; i++) {
          const actual = elementos[i]?.getProps(['x', 'width'], true);
          const siguiente = elementos[i + 1]?.getProps(['x', 'width'], true);
          const barra = barras[i];
          if (!actual || !siguiente || !barra) continue;
          const y = Math.round(escala.getPixelForValue(barra.fin)) + 0.5;
          ctx.beginPath();
          ctx.moveTo(actual['x'] + actual['width'] / 2, y);
          ctx.lineTo(siguiente['x'] - siguiente['width'] / 2, y);
          ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.font = `600 11px ${this.paleta.fuente}`;
        ctx.fillStyle = this.paleta.navy;
        ctx.textAlign = 'center';
        barras.forEach((barra, i) => {
          const el = elementos[i]?.getProps(['x', 'y', 'base'], true);
          if (!el) return;
          const sube = barra.fin >= barra.inicio;
          ctx.textBaseline = sube ? 'bottom' : 'top';
          const y = sube
            ? Math.min(el['y'], el['base']) - AIRE_ETIQUETA
            : Math.max(el['y'], el['base']) + AIRE_ETIQUETA;
          ctx.fillText(
            formatCopCompacto(toFiniteNumber(barra.fila.valor) ?? 0, locale),
            el['x'],
            y,
          );
        });

        ctx.restore();
      },
    },
  ];

  constructor() {
    effect((onCleanup) => {
      const periodo = this.periodo();
      this.estado.set('cargando');
      const sub = this.service.obtener(rangoDePeriodo(periodo)).subscribe({
        next: (res) => {
          this.resumen.set(res);
          this.periodoPintado.set(periodo);
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
