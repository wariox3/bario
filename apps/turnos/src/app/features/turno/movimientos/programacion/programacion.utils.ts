import { INICIALES_DIA_SEMANA_ES, fromIsoDate } from '@reddoc/core';
import type { ProgramacionFecha, ProgramacionVigencia } from './programacion.model';

/**
 * Convierte un string ISO `YYYY-MM-DD` (como llegan en
 * `ProgramacionDetalleResponse.fechas`) a la columna normalizada del calendario
 * (`ProgramacionFecha`): día visible, inicial del día de semana y si es fin de
 * semana. Lo comparten la ficha de programación y la vista previa del prototipo.
 */
export function toProgramacionFecha(iso: string): ProgramacionFecha {
  const date = fromIsoDate(iso);
  const dow = date ? date.getDay() : 0;
  return {
    clave: iso,
    etiqueta: iso.slice(8, 10).replace(/^0/, ''),
    inicial: INICIALES_DIA_SEMANA_ES[dow],
    finDeSemana: dow === 0 || dow === 6,
  };
}

/**
 * `true` si la fecha ISO `YYYY-MM-DD` cae dentro de la vigencia (ambos extremos
 * inclusive). Sin vigencia (`null`) todo día es válido — degradado seguro. La
 * comparación es **lexicográfica**: las fechas ISO ordenan igual que
 * cronológicamente, sin construir `Date`. Reutilizable por cualquier tabla de día
 * (agregar-contrato usa día→ISO; editar-puesto usa la clave ISO directa).
 */
export function estaEnVigencia(iso: string, vigencia: ProgramacionVigencia | null): boolean {
  if (!vigencia) return true;
  return iso >= vigencia.desde && iso <= vigencia.hasta;
}

/**
 * Subconjunto de claves ISO que caen dentro de la vigencia, como `Set` para lookup
 * O(1) por columna. Sin vigencia devuelve todas (todo habilitado). Pensado para las
 * grillas keyed por clave ISO (ej. `editar-puesto`, cuyas columnas son
 * `ProgramacionFecha.clave`).
 */
export function clavesEnVigencia(
  claves: readonly string[],
  vigencia: ProgramacionVigencia | null,
): ReadonlySet<string> {
  return new Set(claves.filter((c) => estaEnVigencia(c, vigencia)));
}

/**
 * Rango de vigencia formateado para el chip de la banda: `15 jul – 31 jul 2026`
 * (día+mes en el `desde`; día+mes+año en el `hasta`). `null` si falta la vigencia o
 * alguno de los extremos no parsea. `locale` sale de `i18n.lang()` en el consumidor.
 */
export function formatVigenciaRango(
  vigencia: ProgramacionVigencia | null,
  locale: string,
): string | null {
  if (!vigencia) return null;
  const desde = fromIsoDate(vigencia.desde);
  const hasta = fromIsoDate(vigencia.hasta);
  if (!desde || !hasta) return null;
  const diaMes = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
  const diaMesAnio = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${diaMes.format(desde)} – ${diaMesAnio.format(hasta)}`;
}
