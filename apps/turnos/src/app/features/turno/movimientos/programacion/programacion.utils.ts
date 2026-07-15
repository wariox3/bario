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
 * Construye una `ProgramacionVigencia` a partir de los extremos ISO opcionales de
 * una línea. `null` si falta alguno — la regla es "rango solo con ambos extremos"
 * (la comparten el store y las filas del detalle, donde los campos son opcionales
 * hasta que el backend los envíe).
 */
export function vigenciaDe(
  desde?: string | null,
  hasta?: string | null,
): ProgramacionVigencia | null {
  return desde && hasta ? { desde, hasta } : null;
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
 * Un extremo del rango como día + mes corto **sin año**: `15 de jul` (es) / `Jul 15`
 * (en). El mes abreviado va sin el punto final que agregan algunos locales.
 */
function formatDiaMes(date: Date, locale: string): string {
  const dia = date.getDate();
  const mes = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace(/\.$/, '');
  return locale.startsWith('es') ? `${dia} de ${mes}` : `${mes} ${dia}`;
}

/**
 * Rango de vigencia formateado para la banda/chip: `15 de jul - 31 de jul` (mismo
 * día+mes en ambos extremos, sin año — el período/año ya se ve en el header). `null`
 * si falta la vigencia o algún extremo no parsea. `locale` sale de `i18n.lang()`.
 */
export function formatVigenciaRango(
  vigencia: ProgramacionVigencia | null,
  locale: string,
): string | null {
  if (!vigencia) return null;
  const desde = fromIsoDate(vigencia.desde);
  const hasta = fromIsoDate(vigencia.hasta);
  if (!desde || !hasta) return null;
  return `${formatDiaMes(desde, locale)} - ${formatDiaMes(hasta, locale)}`;
}
