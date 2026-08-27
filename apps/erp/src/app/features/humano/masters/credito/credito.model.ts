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
  /**
   * Cédula del empleado del contrato.
   *
   * TODO(backend): el esquema `HumCredito` **no la declara** todavía (sí lo hace
   * `HumAdicional`, con este mismo nombre). Opcional hasta entonces: llega
   * `undefined` y la columna queda vacía.
   */
  readonly contrato_contacto_numero_identificacion?: string | null;
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
