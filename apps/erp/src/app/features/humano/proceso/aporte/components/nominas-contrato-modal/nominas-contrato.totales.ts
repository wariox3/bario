/**
 * Totales del cruce entre el aporte y las nóminas del contrato.
 *
 * Módulo puro, testeado en `nominas-contrato.totales.spec.ts`. El ERP anterior
 * repetía diez métodos `calcularTotalX()` idénticos salvo el campo; acá es una
 * función que recibe qué campos sumar.
 */
import { toFiniteNumber } from '@reddoc/core';

/** Suma un campo a lo largo de las filas. Lo no numérico cuenta como cero. */
export function sumar<T>(filas: readonly T[], campo: keyof T): number {
  return filas.reduce((suma, fila) => suma + (toFiniteNumber(fila[campo]) ?? 0), 0);
}

/**
 * Suma varios campos de una vez y devuelve el mapa `campo → total`.
 *
 * Recorre las filas una sola vez por campo pedido; con los pocos registros que
 * tiene un contrato en un periodo, la claridad vale más que el recorrido único.
 */
export function totalesDe<T, K extends keyof T>(
  filas: readonly T[],
  campos: readonly K[],
): Record<K, number> {
  const totales = {} as Record<K, number>;
  for (const campo of campos) totales[campo] = sumar(filas, campo);
  return totales;
}
