import { toFiniteNumber } from '@reddoc/core';
import type { FilaCascada, TipoCascada } from './estado-resultados-tablero.model';

/** Una barra flotante de la cascada: Chart.js la pinta de `inicio` a `fin`. */
export interface BarraCascada {
  readonly fila: FilaCascada;
  readonly inicio: number;
  readonly fin: number;
}

const ACUMULAN: ReadonlySet<TipoCascada> = new Set(['entrada', 'salida']);

/**
 * El camino del peso: cada entrada o salida flota desde lo que va quedando y
 * lo mueve; cada subtotal y el total se paran en el cero y llegan al acumulado.
 *
 * Las salidas ya llegan negativas, así que todo se suma con su signo: una
 * pérdida baja del cero sola. En un subtotal manda el `valor` del backend y el
 * acumulado se resincroniza con él, para que el redondeo no se arrastre de una
 * barra a la siguiente.
 */
export function barrasCascada(filas: readonly FilaCascada[]): BarraCascada[] {
  let acumulado = 0;
  return filas.map((fila) => {
    const valor = toFiniteNumber(fila.valor) ?? 0;
    if (ACUMULAN.has(fila.tipo)) {
      const inicio = acumulado;
      acumulado += valor;
      return { fila, inicio, fin: acumulado };
    }
    acumulado = valor;
    return { fila, inicio: 0, fin: valor };
  });
}

/**
 * Variación porcentual contra el año anterior; `null` si no hay contra qué
 * comparar. Sobre el valor absoluto de la base: si el año pasado fue pérdida,
 * pasar de −100 a −50 es mejorar, y tiene que dar positivo.
 */
export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}
