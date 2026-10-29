import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ChartModule } from 'primeng/chart';
import type { ChartData, ChartOptions, Plugin, Scale } from 'chart.js';
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

/**
 * Ancho por barra bajo el que la cascada se acuesta: ni en dos líneas ni en
 * diagonal caben ocho rótulos uno al lado del otro. Se mide la gráfica y no la
 * pantalla: con el menú lateral abierto, una laptop también se queda corta.
 */
const ANCHO_MIN_POR_BARRA = 80;

/** Margen para volver a pararse: sin él, la barra de scroll que aparece o se va la hace titilar. */
const HISTERESIS = 4;

/** Ancho por barra desde el que un rótulo cabe en una sola línea. */
const ANCHO_UNA_LINEA = 130;

/** Separación entre la barra y su etiqueta de valor, en px. */
const AIRE_ETIQUETA = 4;

/**
 * Parte un rótulo en dos líneas por el espacio más cercano a la mitad
 * ("Ganancia / operacional"), para la cascada de pie en anchos medianos.
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
 * Cuando la gráfica es angosta (un celular, o una laptop con el menú abierto)
 * la cascada se acuesta y se lee de arriba abajo, como el estado
 * de resultados impreso: rótulo completo a la izquierda, valor al final de la
 * barra. En los dos sentidos, subtotales y total van en negrita, como los
 * renglones de suma de un estado de resultados.
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

  private readonly documento = inject(DOCUMENT);
  private readonly paleta = leerPaletaGrafica(this.documento);

  /** Cascada acostada (`indexAxis: 'y'`): cuando la gráfica es angosta. */
  protected readonly horizontal = signal(false);

  /** Contenedor de la gráfica: su ancho no cambia al acostarla, así que se puede medir. */
  private readonly lienzo = viewChild<ElementRef<HTMLElement>>('lienzo');

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

  /** `del 01/10/2026 al 31/10/2026`: el rango completo, no un corte en hoy. */
  protected readonly rango = computed(() => {
    const r = this.resumen();
    if (!r) return '';
    return this.t()
      .inicio.estadoResultados.rango.replace('{desde}', formatFechaCorta(r.fecha_desde, ''))
      .replace('{hasta}', formatFechaCorta(r.fecha_hasta, ''));
  });

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
    const horizontal = this.horizontal();
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
          maxBarThickness: horizontal ? 22 : 56,
          categoryPercentage: 0.78,
          barPercentage: 0.9,
        },
      ],
    };
  });

  protected readonly opcionesGrafica = computed<ChartOptions<'bar'>>(() => {
    const barras = this.barras();
    const locale = this.locale();
    const horizontal = this.horizontal();
    const tx = this.t().inicio.estadoResultados;
    const fuente = { family: this.paleta.fuente, size: 11 };
    // Los renglones de suma resaltan, como en el estado de resultados impreso.
    const esSuma = (i: number): boolean => {
      const tipo = barras[i]?.fila.tipo;
      return tipo === 'subtotal' || tipo === 'total';
    };

    const categoria = {
      grid: { display: false },
      border: { color: this.paleta.linea },
      ticks: {
        font: (ctx: { index: number }) => ({ ...fuente, weight: esSuma(ctx.index) ? 600 : 400 }),
        color: (ctx: { index: number }) =>
          esSuma(ctx.index) ? this.paleta.navy : this.paleta.muted,
        maxRotation: 0,
        // Son ocho pasos de una sola cuenta: saltarse uno corta el camino.
        autoSkip: false,
        // Acostada, los rótulos se alinean a la izquierda, como los renglones.
        crossAlign: horizontal ? ('far' as const) : ('near' as const),
        // De pie y sin espacio para una línea, el rótulo va en dos.
        callback(this: Scale, value: string | number) {
          const rotulo = this.getLabelForValue(Number(value));
          const porBarra = this.chart.width / Math.max(barras.length, 1);
          return !horizontal && porBarra < ANCHO_UNA_LINEA ? partirEnDosLineas(rotulo) : rotulo;
        },
      },
    };
    const valor = {
      // Con pérdida el eje cruza el cero; el cero siempre queda a la vista.
      beginAtZero: true,
      grace: horizontal ? '15%' : '10%',
      grid: { color: this.paleta.linea },
      border: { display: false },
      ticks: {
        font: fuente,
        color: this.paleta.muted,
        maxTicksLimit: horizontal ? 4 : 5,
        padding: horizontal ? 4 : 8,
        callback: (value: string | number) => formatCopCompacto(Number(value), locale),
      },
    };

    return {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
      // Aire para la etiqueta de la barra que más se aleja: arriba, o a la derecha acostada.
      layout: { padding: horizontal ? { right: 28 } : { top: 18 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase(this.paleta),
          callbacks: {
            label: (item) => formatCop(barras[item.dataIndex]?.fila.valor, locale),
            // En lo que entra o sale, cómo queda la cuenta después de la barra.
            footer: (items) => {
              const barra = barras[items[0]?.dataIndex ?? -1];
              if (!barra || esSuma(items[0]?.dataIndex ?? -1)) return '';
              return `${tx.leyenda.subtotal}: ${formatCop(barra.fin, locale)}`;
            },
          },
        },
      },
      scales: horizontal ? { y: categoria, x: valor } : { x: categoria, y: valor },
    };
  });

  /**
   * Etiqueta de valor al final de cada barra y el filete punteado que une el
   * final de una con el arranque de la siguiente: el camino del peso se lee sin
   * pasar el mouse, de izquierda a derecha o, acostada, de arriba abajo.
   */
  protected readonly plugins: Plugin<'bar'>[] = [
    {
      id: 'cascadaEtiquetas',
      afterDatasetsDraw: (chart) => {
        const barras = this.barras();
        const acostada = chart.options.indexAxis === 'y';
        const elementos = chart.getDatasetMeta(0).data;
        const escala = chart.scales[acostada ? 'x' : 'y'];
        if (!escala) return;
        const { ctx } = chart;
        const locale = this.locale();
        ctx.save();

        ctx.strokeStyle = this.paleta.tenue;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let i = 0; i < barras.length - 1; i++) {
          const actual = elementos[i]?.getProps(['x', 'y', 'width', 'height'], true);
          const siguiente = elementos[i + 1]?.getProps(['x', 'y', 'width', 'height'], true);
          const barra = barras[i];
          if (!actual || !siguiente || !barra) continue;
          const nivel = Math.round(escala.getPixelForValue(barra.fin)) + 0.5;
          ctx.beginPath();
          if (acostada) {
            ctx.moveTo(nivel, actual['y'] + actual['height'] / 2);
            ctx.lineTo(nivel, siguiente['y'] - siguiente['height'] / 2);
          } else {
            ctx.moveTo(actual['x'] + actual['width'] / 2, nivel);
            ctx.lineTo(siguiente['x'] - siguiente['width'] / 2, nivel);
          }
          ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.font = `600 11px ${this.paleta.fuente}`;
        ctx.fillStyle = this.paleta.navy;
        barras.forEach((barra, i) => {
          const el = elementos[i]?.getProps(['x', 'y', 'base'], true);
          if (!el) return;
          const texto = formatCopCompacto(toFiniteNumber(barra.fila.valor) ?? 0, locale);
          const sube = barra.fin >= barra.inicio;
          if (acostada) {
            // Siempre a la derecha de la barra, como la columna de montos del
            // estado impreso: a la izquierda chocaría con los rótulos.
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(texto, Math.max(el['x'], el['base']) + AIRE_ETIQUETA, el['y']);
          } else {
            ctx.textAlign = 'center';
            ctx.textBaseline = sube ? 'bottom' : 'top';
            const y = sube
              ? Math.min(el['y'], el['base']) - AIRE_ETIQUETA
              : Math.max(el['y'], el['base']) + AIRE_ETIQUETA;
            ctx.fillText(texto, el['x'], y);
          }
        });

        ctx.restore();
      },
    },
  ];

  constructor() {
    // El contenedor aparece con los datos; jsdom no trae `ResizeObserver` y ahí queda de pie.
    effect((onCleanup) => {
      const el = this.lienzo()?.nativeElement;
      const Observador = this.documento.defaultView?.ResizeObserver;
      if (!el || !Observador) return;
      const observador = new Observador(([entrada]) => {
        if (!entrada) return;
        const porBarra = entrada.contentRect.width / Math.max(this.barras().length, 1);
        const umbral = ANCHO_MIN_POR_BARRA + (this.horizontal() ? HISTERESIS : 0);
        this.horizontal.set(porBarra < umbral);
      });
      observador.observe(el);
      onCleanup(() => observador.disconnect());
    });

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
