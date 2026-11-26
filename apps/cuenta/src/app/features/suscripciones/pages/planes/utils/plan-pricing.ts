export { formatCop } from '@reddoc/core';

export const ANNUAL_DISCOUNT = 0.1;

export function parsePrecio(precio: string): number {
  const n = Number(precio);
  return Number.isNaN(n) ? 0 : n;
}

/** Un plan sin precio (0, vacío o inválido) no se puede cobrar ni activar. */
export function tienePrecio(precio: string): boolean {
  return parsePrecio(precio) > 0;
}

export function displayedMonthly(precio: string, annual: boolean): number {
  const base = parsePrecio(precio);
  return annual ? Math.round(base * (1 - ANNUAL_DISCOUNT)) : Math.round(base);
}

export function annualTotal(precio: string): number {
  const base = parsePrecio(precio);
  return Math.round(((base * (1 - ANNUAL_DISCOUNT)) / 30) * 365);
}
