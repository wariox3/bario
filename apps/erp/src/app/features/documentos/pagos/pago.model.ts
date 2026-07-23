/**
 * Contratos de datos de un **pago** de documento (cobro en el acto).
 *
 * Los pagos son un building block transversal (hermano de `comercial` y
 * `contable`): un documento que se cobra al emitirse —factura POS, nota crédito
 * de venta…— lleva una lista de `{ cuenta_banco, monto }` embebida en su payload.
 *
 * Nota: el shape (`pagos`/`pago` embebidos en el documento) es una **asunción de
 * contrato** calcada del legacy; pendiente de confirmar con el backend nuevo.
 */

/** Pago leído desde la API (una fila de la tabla de pagos). */
export interface PagoRead {
  readonly id: number | null;
  readonly cuenta_banco: number | null;
  readonly cuenta_banco_nombre?: string | null;
  /** Monto del pago como string con cola de decimales (`"50000.00"`). */
  readonly pago: string | number | null;
}

/** Body (POST/PATCH) de un pago. */
export interface PagoPayload {
  readonly cuenta_banco: number | null;
  /** Monto como string con 2 decimales (`"50000.00"`). */
  readonly pago: string;
}
