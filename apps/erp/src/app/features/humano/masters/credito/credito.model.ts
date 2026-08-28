/**
 * Crédito de empleado (HumCredito).
 *
 * Préstamo/descuento atado a un contrato. Shape de lectura del backend: las FK
 * (`contrato`, `concepto`) llegan como id pelado (sin sufijo `_id`) + companion
 * `*_nombre`. Los montos (`total`, `cuota`, `abono`, `saldo`) pueden llegar como
 * string Decimal → se normalizan a número en el mapper. Los campos `abono`,
 * `saldo`, `cuota_actual`, `validar_cuotas`, `pagado` y `comentario` los gestiona
 * el backend y no se editan desde el formulario.
 */
export interface Credito {
  readonly id: number;
  readonly fecha_inicio: string | null;
  readonly total: string | number | null;
  readonly cuota: string | number | null;
  readonly abono: string | number | null;
  readonly saldo: string | number | null;
  readonly cantidad_cuotas: number | null;
  readonly cuota_actual: number | null;
  readonly validar_cuotas: boolean;
  readonly inactivo: boolean;
  readonly pagado: boolean;
  readonly aplica_prima: boolean;
  readonly aplica_cesantia: boolean;
  readonly comentario: string | null;
  // Foreign keys (id pelado) + companion `*_nombre`
  readonly contrato: number | null;
  readonly contrato_nombre: string | null;
  /** Cédula del empleado del contrato: alimenta el addon del selector y la ficha. */
  readonly contrato_contacto_numero_identificacion: string | null;
  readonly concepto: number | null;
  readonly concepto_nombre: string | null;
}

/**
 * Payload para crear o actualizar un crédito. Solo los campos editables del
 * formulario; las FK van como id pelado.
 */
export interface CreditoPayload {
  fecha_inicio: string | null;
  total: number | null;
  cuota: number | null;
  cantidad_cuotas: number | null;
  inactivo: boolean;
  aplica_prima: boolean;
  aplica_cesantia: boolean;
  contrato: number | null;
  concepto: number | null;
}

/**
 * Pago aplicado a un crédito (GET `/humano/credito/{id}/pagos/`).
 *
 * Cada pago es un descuento hecho al empleado en una nómina. `fecha` y
 * `documento` son opcionales en el contrato: identifican de qué nómina salió el
 * descuento y puede que el backend no los exponga desde el primer día.
 *
 * ⚠️ El endpoint está pedido, todavía no existe. Hasta que responda, la card de
 * pagos de la ficha muestra su estado de error.
 */
export interface CreditoPago {
  readonly id: number;
  /** Valor descontado. Como el resto de los montos, puede llegar como string Decimal. */
  readonly pago: string | number | null;
  /** Fecha del descuento, si el backend la expone. */
  readonly fecha?: string | null;
  /** Documento (nómina) del que salió el descuento, si el backend lo expone. */
  readonly documento?: number | null;
}
