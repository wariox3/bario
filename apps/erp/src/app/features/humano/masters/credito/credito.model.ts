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
 * Pago aplicado a un crédito: cada descuento hecho al empleado en una nómina.
 *
 * No existe entidad propia en el backend: son **líneas de documento**
 * (`/general/documento-detalle/`) que apuntan al crédito por su FK `credito`.
 * La línea ya trae el tipo, la fecha y el número de su documento, y el valor
 * descontado en `deduccion`.
 */
export interface CreditoPago {
  readonly id: number;
  readonly documento_documento_tipo_nombre: string | null;
  readonly documento_fecha: string | null;
  readonly documento_numero: number | null;
  /** Valor descontado. Como el resto de los montos, llega como string Decimal. */
  readonly deduccion: string | number | null;
}
