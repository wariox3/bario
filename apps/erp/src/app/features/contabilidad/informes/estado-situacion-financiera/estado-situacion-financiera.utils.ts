import { formatCop, toFiniteNumber } from '@reddoc/core';
import type { SituacionFormalFila } from './estado-situacion-financiera.types';

/**
 * Importe con la convención contable: los negativos **entre paréntesis** y sin
 * signo (`($ 71.340.000,00)`). Vacío si no viene.
 *
 * En un estado financiero el signo menos se pierde al escanear una columna; el
 * paréntesis no. Y no va en rojo: una cuenta correctora (la depreciación) es
 * negativa por naturaleza, no un error.
 */
export function formatMontoContable(value: string | null, locale = 'es-CO'): string {
  const n = toFiniteNumber(value);
  if (n === null) return '';
  return n < 0 ? `(${formatCop(-n, locale)})` : formatCop(n, locale);
}

/** Cifra resumida en millones para la franja de resumen (`$ 830,4 M`). Vacío si no viene. */
export function formatMillones(value: string | number | null, locale = 'es-CO'): string {
  const n = toFiniteNumber(value);
  if (n === null) return '';
  const millones = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(n) / 1_000_000);
  return `${n < 0 ? '−' : ''}$ ${millones} M`;
}

/** Razón con dos decimales (`1,62`). Vacía si el backend la manda nula (divisor en cero). */
export function formatRazon(value: string | null, locale = 'es-CO'): string {
  const n = toFiniteNumber(value);
  if (n === null) return '';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Hacia dónde se movió una cifra frente al corte anterior. `null` = no se movió o no hay dato. */
export type Direccion = 'sube' | 'baja';

export function direccionDe(value: string | number | null): Direccion | null {
  const n = toFiniteNumber(value);
  if (n === null || n === 0) return null;
  return n > 0 ? 'sube' : 'baja';
}

/** Diferencia entre dos importes del backend, fijada a sus 6 decimales; `null` si falta alguno. */
export function diferencia(actual: string | null, anterior: string | null): string | null {
  const a = toFiniteNumber(actual);
  const b = toFiniteNumber(anterior);
  if (a === null || b === null) return null;
  return (a - b).toFixed(6);
}

/** Una fila tal como se pinta, con su estado de plegado ya resuelto. */
export interface SituacionFilaVm {
  /** Posición en `filas`: identifica la sección o subsección que se pliega. */
  readonly indice: number;
  readonly fila: SituacionFormalFila;
  /** Solo `SECCION` y `SUBSECCION` se pliegan. */
  readonly plegable: boolean;
  readonly plegada: boolean;
  /**
   * De dónde salen los importes que pinta la fila. Una subsección plegada pinta
   * los de su subtotal, que queda oculto; una sección o subsección abierta no
   * pinta ninguno (`null`).
   */
  readonly importes: SituacionFormalFila | null;
}

/**
 * Las filas que quedan a la vista con las secciones plegadas. El plegado es
 * solo de pantalla: el backend manda siempre el estado entero.
 *
 * - **Subsección plegada** (activo corriente): se ocultan sus líneas y su
 *   subtotal, y la cabecera pasa a pintar los importes de ese subtotal. Se lee
 *   «▸ Activo corriente · $ X», sin repetir la cifra en dos filas.
 * - **Sección plegada** (activo): se oculta todo hasta su `TOTAL`, que queda a
 *   la vista. La cabecera no pinta importes: el total con doble subrayado ya
 *   está justo debajo y es la cifra que se busca.
 *
 * El backend no anida: las filas llegan aplanadas y lo único que dice dónde
 * termina cada bloque es el `tipo`. Una subsección la cierra su `SUBTOTAL` (o el
 * `TOTAL` de la sección, si viniera sin subtotal); una sección, su `TOTAL`.
 */
export function filasVisibles(
  filas: readonly SituacionFormalFila[],
  plegadas: ReadonlySet<number>,
): readonly SituacionFilaVm[] {
  const subtotalDe = new Map<number, SituacionFormalFila>();
  let abierta: number | null = null;
  filas.forEach((fila, indice) => {
    if (fila.tipo === 'SUBSECCION') abierta = indice;
    else if (fila.tipo === 'SUBTOTAL' && abierta !== null) {
      subtotalDe.set(abierta, fila);
      abierta = null;
    } else if (fila.tipo === 'SECCION' || fila.tipo === 'TOTAL') abierta = null;
  });

  const visibles: SituacionFilaVm[] = [];
  let seccion: number | null = null;
  let subseccion: number | null = null;

  filas.forEach((fila, indice) => {
    const seccionPlegada = seccion !== null && plegadas.has(seccion);
    switch (fila.tipo) {
      case 'SECCION': {
        seccion = indice;
        subseccion = null;
        visibles.push({
          indice,
          fila,
          plegable: true,
          plegada: plegadas.has(indice),
          importes: null,
        });
        return;
      }
      case 'SUBSECCION': {
        subseccion = indice;
        if (seccionPlegada) return;
        const plegada = plegadas.has(indice);
        visibles.push({
          indice,
          fila,
          plegable: true,
          plegada,
          importes: plegada ? (subtotalDe.get(indice) ?? null) : null,
        });
        return;
      }
      case 'TOTAL':
      case 'TOTAL_FINAL': {
        seccion = null;
        subseccion = null;
        visibles.push({ indice, fila, plegable: false, plegada: false, importes: fila });
        return;
      }
      default: {
        const subseccionPlegada = subseccion !== null && plegadas.has(subseccion);
        if (fila.tipo === 'SUBTOTAL') subseccion = null;
        if (seccionPlegada || subseccionPlegada) return;
        visibles.push({ indice, fila, plegable: false, plegada: false, importes: fila });
      }
    }
  });

  return visibles;
}

/** Primer día del año de una fecha ISO (`2026-10-31` → `2026-01-01`). */
export function inicioDelAnio(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}
