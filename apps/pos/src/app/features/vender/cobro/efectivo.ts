/** Billetes contra los que se redondea el efectivo recibido (pesos colombianos). */
const BILLETES = [10_000, 20_000, 50_000, 100_000] as const;

/**
 * Montos que se suelen recibir por encima del total: el total redondeado hacia
 * arriba a cada billete, sin repetidos, de menor a mayor y hasta `maximo`. El
 * exacto va aparte (es su propio chip). Para $47.600 → 50.000, 60.000, 100.000.
 */
export function sugerenciasEfectivo(total: number, maximo = 3): number[] {
  if (total <= 0) return [];
  const montos = new Set<number>();
  for (const billete of BILLETES) {
    const monto = Math.ceil(total / billete) * billete;
    if (monto > total) montos.add(monto);
  }
  return [...montos].sort((a, b) => a - b).slice(0, maximo);
}

/** Lo que se devuelve al cliente; nunca negativo. */
export function cambio(recibido: number, total: number): number {
  return Math.max(recibido - total, 0);
}
