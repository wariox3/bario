/**
 * La regla de los **adicionales**: un concepto que suma o que resta.
 *
 * El registro guarda los dos campos, `adicional` y `deduccion`, con uno en cero.
 * Cuál se llena lo decide la **operación** del concepto, que es también lo que
 * filtra el catálogo al elegirlo.
 *
 * El ERP anterior resolvía esto con un `valueChanges` que patcheaba los dos
 * campos del formulario en cada tecla. Acá es una función pura, testeada en
 * `liquidacion.adicionales.spec.ts`.
 */
import { toFiniteNumber } from '@reddoc/core';
import type { LiquidacionAdicional } from './liquidacion.model';

/**
 * Operación del concepto, tal como la espera el catálogo
 * (`/humano/concepto/seleccionar/?adicional=True&operacion=`).
 */
export const OPERACION = {
  /** Suma al total: bonificaciones, reintegros. */
  ADICIONA: '1',
  /** Resta del total: préstamos, embargos. */
  DEDUCE: '-1',
} as const;

export type Operacion = (typeof OPERACION)[keyof typeof OPERACION];

/** Los dos montos del registro: el que aplica lleva el valor, el otro va en cero. */
export interface MontosAdicional {
  readonly adicional: number;
  readonly deduccion: number;
}

/**
 * Reparte el valor tecleado según la operación.
 *
 * Un valor no numérico cuenta como cero en vez de mandar `NaN` al backend.
 */
export function montosDe(operacion: Operacion, valor: number | string | null): MontosAdicional {
  const monto = toFiniteNumber(valor) ?? 0;
  return operacion === OPERACION.DEDUCE
    ? { adicional: 0, deduccion: monto }
    : { adicional: monto, deduccion: 0 };
}

/**
 * Deduce la operación de un registro ya guardado, para reabrirlo en edición.
 *
 * Manda la deducción cuando trae monto; si los dos están en cero (un registro a
 * medias), se asume adición, que es lo que ofrece el catálogo por defecto.
 */
export function operacionDe(adicional: Pick<LiquidacionAdicional, 'deduccion'>): Operacion {
  return (toFiniteNumber(adicional.deduccion) ?? 0) > 0 ? OPERACION.DEDUCE : OPERACION.ADICIONA;
}

/** El monto que hay que mostrar en el campo "valor" al reabrir el registro. */
export function valorDe(adicional: Pick<LiquidacionAdicional, 'adicional' | 'deduccion'>): number {
  const deduccion = toFiniteNumber(adicional.deduccion) ?? 0;
  return deduccion > 0 ? deduccion : (toFiniteNumber(adicional.adicional) ?? 0);
}
