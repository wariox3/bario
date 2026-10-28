import type { ChartOptions, TooltipOptions } from 'chart.js';
import { fromIsoDate, startOfToday, toIsoDate } from '@reddoc/core';

/**
 * Lo común a las gráficas de los inicios (`comercial-resumen`,
 * `resultado-resumen`): el período en curso, el corte en hoy, los rótulos y la
 * paleta. Cada gráfica arma sus datasets; el eje, el tooltip y los colores salen
 * de acá para que todas se lean igual.
 */

/** Período que aceptan los endpoints de `general/tablero/` (`?periodo=`): el mes o el año en curso. */
export type ResumenPeriodo = 'mes' | 'anio';

export const RESUMEN_PERIODOS: readonly ResumenPeriodo[] = ['mes', 'anio'];

/** El punto del período en el que estamos hoy, y los que todavía no llegan. */
export type Tramo = 'pasado' | 'hoy' | 'futuro';

export type PaletaGrafica = ReturnType<typeof leerPaletaGrafica>;

export function localeDe(lang: string): string {
  return lang === 'en' ? 'en-US' : 'es-CO';
}

/**
 * Tramo de cada punto respecto de hoy. Comparación ISO, lexicográfica; en el
 * año cada punto es un mes, así que se compara `AAAA-MM`.
 *
 * Es la base del corte en hoy: el backend manda en cero lo que aún no pasa, pero
 * ese cero no es "no hubo movimiento", es "todavía no llega", y se pinta hueco.
 */
export function tramosDe(fechas: readonly string[], periodo: ResumenPeriodo): Tramo[] {
  const clave = (iso: string): string => (periodo === 'anio' ? iso.slice(0, 7) : iso);
  const actual = clave(toIsoDate(startOfToday()));
  return fechas.map((fecha) => {
    const k = clave(fecha);
    return k === actual ? 'hoy' : k > actual ? 'futuro' : 'pasado';
  });
}

/** Rótulo del eje: el número del día o el mes abreviado (`oct`). */
export function etiquetaCorta(iso: string, periodo: ResumenPeriodo, locale: string): string {
  const fecha = fromIsoDate(iso);
  if (!fecha) return '';
  if (periodo === 'mes') return String(fecha.getDate());
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(fecha).replace('.', '');
}

/** Rótulo del tooltip: `14 de octubre` / `octubre de 2026`. */
export function etiquetaLarga(iso: string, periodo: ResumenPeriodo, locale: string): string {
  const fecha = fromIsoDate(iso);
  if (!fecha) return '';
  const opciones: Intl.DateTimeFormatOptions =
    periodo === 'mes' ? { day: 'numeric', month: 'long' } : { month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, opciones).format(fecha);
}

/** Rótulo del período en la cabecera: `octubre de 2026` / `2026`. */
export function rotuloPeriodo(
  fechaDesde: string | null | undefined,
  periodo: ResumenPeriodo,
  locale: string,
): string {
  const desde = fromIsoDate(fechaDesde);
  if (!desde) return '';
  if (periodo === 'anio') return String(desde.getFullYear());
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(desde);
}

/**
 * Chart.js pinta en canvas y no ve las clases de Tailwind: los tokens de marca
 * se leen de las CSS vars del tema, con fallback a sus valores.
 */
export function leerPaletaGrafica(doc: Document) {
  const estilos = getComputedStyle(doc.documentElement);
  const leer = (nombre: string, fallback: string): string =>
    estilos.getPropertyValue(nombre).trim() || fallback;
  return {
    navy: leer('--color-brand-navy', '#13263c'),
    muted: leer('--color-brand-muted', '#7a8fa3'),
    // Las barras van en navy a media tinta: el sólido queda para el hover.
    barra: 'rgba(20, 48, 73, 0.72)',
    // El sky de marca: el único acento de las gráficas.
    acento: '#77aad7',
    tenue: 'rgba(20, 48, 73, 0.25)',
    linea: 'rgba(20, 48, 73, 0.06)',
    fuente: getComputedStyle(doc.body).fontFamily,
  };
}

/**
 * Ejes de las gráficas de período. El rótulo del punto en curso va en navy y
 * negrita, los que aún no llegan en tenue; el eje Y en pesos compactos.
 */
export function ejesPeriodo(
  paleta: PaletaGrafica,
  tramos: readonly Tramo[],
  locale: string,
): ChartOptions<'bar'>['scales'] {
  const compacto = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const fuente = { family: paleta.fuente, size: 11 };
  return {
    x: {
      grid: { display: false },
      border: { color: paleta.linea },
      ticks: {
        font: (ctx) => ({ ...fuente, weight: tramos[ctx.index] === 'hoy' ? 700 : 400 }),
        color: (ctx) =>
          tramos[ctx.index] === 'hoy'
            ? paleta.navy
            : tramos[ctx.index] === 'futuro'
              ? paleta.tenue
              : paleta.muted,
        maxRotation: 0,
        autoSkip: true,
        autoSkipPadding: 6,
      },
    },
    y: {
      beginAtZero: true,
      grace: '8%',
      grid: { color: paleta.linea },
      border: { display: false },
      ticks: {
        font: fuente,
        color: paleta.muted,
        maxTicksLimit: 5,
        padding: 8,
        callback: (value) => compacto.format(Number(value)),
      },
    },
  };
}

/** Tooltip de marca: navy, sin cuadros de color; los callbacks los pone cada gráfica. */
export function tooltipBase(paleta: PaletaGrafica): Partial<TooltipOptions<'bar'>> {
  const fuente = { family: paleta.fuente, size: 11 };
  return {
    backgroundColor: paleta.navy,
    titleColor: '#fff',
    bodyColor: '#fff',
    footerColor: '#fff',
    titleFont: { ...fuente, weight: 600 },
    bodyFont: { ...fuente, size: 12 },
    footerFont: { ...fuente, size: 12, weight: 600 },
    padding: 10,
    cornerRadius: 8,
    displayColors: false,
    // Los puntos que aún no llegan no tienen nada que contar.
    filter: (item) => item.raw !== null,
  };
}
