/**
 * Contratos de datos de un **pago** de documento (cobro en el acto).
 *
 * Los pagos son un building block transversal (hermano de `comercial` y
 * `contable`). No viajan embebidos en el documento: son un recurso propio,
 * `/general/documento-pago/`, que se registra contra un documento ya creado. El
 * backend mantiene `documento.pago` (suma de los pagos no anulados) y, al aprobar,
 * deja `pendiente = total − pago`; si los pagos superan el total, aprobar responde
 * 400.
 */

/** Pago leído desde la API (una fila de la tabla de pagos). */
export interface PagoRead {
  readonly id: number;
  readonly documento: number;
  readonly cuenta_banco: number;
  readonly cuenta_banco_nombre: string;
  /** Monto como string decimal (`"50000.000000"`). */
  readonly pago?: string | null;
  /** Un pago anulado conserva su valor pero deja de contar en `documento.pago`. */
  readonly estado_anulado: boolean;
}

/** Body (POST/PATCH) de un pago. */
export interface PagoPayload {
  readonly documento: number;
  readonly cuenta_banco: number | null;
  /** Monto como string con 2 decimales (`"50000.00"`). */
  readonly pago: string;
}
