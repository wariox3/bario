/**
 * Utilidades de moneda compartidas por todo el monorepo.
 *
 * El backend suele mandar montos como string con cola de ceros
 * (`"120600.000000"`); estas funciones los normalizan a número antes de
 * formatear. Centralizan lo que antes vivía privado en `DataTableComponent` y
 * duplicado en varias apps.
 */

/** Coacciona un valor crudo a número finito; `null` si vacío/no numérico. */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Cache de `Intl.NumberFormat` por locale (su construcción no es gratis). */
const formatters = new Map<string, Intl.NumberFormat>();

function copFormatter(locale: string): Intl.NumberFormat {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(locale, formatter);
  }
  return formatter;
}

/**
 * Formatea un monto a pesos colombianos con dos decimales (`$ 120.600,00`).
 *
 * Acepta string/number/unknown del backend (con o sin cola de ceros) y lo
 * normaliza antes de formatear. Un valor no numérico produce `''`.
 */
export function formatCop(value: unknown, locale = 'es-CO'): string {
  const n = toFiniteNumber(value);
  if (n === null) return '';
  return copFormatter(locale).format(n);
}
