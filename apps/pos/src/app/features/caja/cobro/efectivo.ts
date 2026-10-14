/** Billetes contra los que se redondea el efectivo recibido (pesos colombianos). */
const REDONDEOS = [1_000, 5_000, 10_000, 20_000, 50_000, 100_000] as const;

/**
 * Montos de efectivo que se suelen recibir para un total: el exacto y el total
 * redondeado hacia arriba a cada billete, sin repetidos y hasta `maximo`
 * opciones. Para $23.400 → 23.400, 24.000, 25.000, 30.000.
 */
export function sugerenciasEfectivo(total: number, maximo = 4): number[] {
  if (total <= 0) return [];
  const montos = new Set<number>([total]);
  for (const billete of REDONDEOS) {
    if (montos.size >= maximo) break;
    montos.add(Math.ceil(total / billete) * billete);
  }
  return [...montos].sort((a, b) => a - b);
}

/** Lo que se devuelve al cliente; nunca negativo. */
export function cambio(recibido: number, total: number): number {
  return Math.max(recibido - total, 0);
}
