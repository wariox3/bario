import type { PagoFormRawValue } from './pago.form';

/** Estado de los pagos de un documento frente a su total. */
export interface ResumenPagos {
  /** Suma de lo recibido en pagos. */
  readonly recibido: number;
  /** Lo que falta por cubrir; nunca negativo. */
  readonly saldo: number;
  /** `true` cuando lo recibido supera el total del documento. */
  readonly excede: boolean;
}

/**
 * Agrega los pagos de un documento contra su total. Función pura: la usan el
 * formulario (resumen bajo los tabs, bloqueo del guardado) y la tabla de pagos
 * (prellenado con el saldo), para que ambos lean la misma cifra.
 */
export function calcularPagos(pagos: readonly PagoFormRawValue[], total: number): ResumenPagos {
  const recibido = pagos.reduce((acc, p) => acc + (p.pago ?? 0), 0);
  return { recibido, saldo: Math.max(total - recibido, 0), excede: recibido > total };
}
