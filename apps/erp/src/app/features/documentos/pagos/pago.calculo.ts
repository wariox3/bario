import type { PagoFormRawValue } from './pago.form';

/** Estado de los pagos de un documento frente a su total. */
export interface ResumenPagos {
  /** Suma de lo recibido en pagos no anulados. */
  readonly recibido: number;
  /** Lo que falta por cubrir; nunca negativo. */
  readonly saldo: number;
  /** `true` cuando lo recibido supera el total: el backend no dejará aprobar. */
  readonly excede: boolean;
}

/**
 * Agrega los pagos de un documento contra su total. Función pura: la usan el
 * formulario y la ficha (resumen bajo los tabs) y la tabla de pagos (prellenado
 * con el saldo), para que todos lean la misma cifra. Un pago anulado no cuenta,
 * igual que en `documento.pago` del backend.
 */
export function calcularPagos(pagos: readonly PagoFormRawValue[], total: number): ResumenPagos {
  const recibido = pagos
    .filter((p) => !p.estado_anulado)
    .reduce((acc, p) => acc + (p.pago ?? 0), 0);
  return { recibido, saldo: Math.max(total - recibido, 0), excede: recibido > total };
}
