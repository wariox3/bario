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
 * Pago aplicado a un crédito, ya listo para pintar.
 *
 * Cada pago es un descuento hecho al empleado en una nómina. No existe entidad
 * propia en el backend: son **líneas de documento** (`/general/documento-detalle/`)
 * que apuntan al crédito por su FK `credito`. `CreditoService.pagos` arma esto
 * cruzando las líneas con la cabecera de su documento.
 */
export interface CreditoPago {
  readonly id: number;
  /** Valor descontado. Como el resto de los montos, puede llegar como string Decimal. */
  readonly pago: string | number | null;
  /** Fecha del documento del que salió el descuento; `null` si no se pudo resolver. */
  readonly fecha?: string | null;
  /** Consecutivo de la nómina del descuento; `null` si no se pudo resolver. */
  readonly documento?: number | null;
}

/**
 * Línea de documento leída con el filtro por crédito.
 *
 * Es el `GenDocumentoDetalle` genérico, del que acá solo interesan cuatro
 * campos. `pago` es el nombre que usaba el ERP anterior para el valor
 * descontado y **hoy no viene en el serializador**; se declara opcional para
 * que la card lo tome sin tocar nada el día que el backend lo sume, y mientras
 * tanto se cae a `total`.
 */
export interface CreditoPagoLineaRead {
  readonly id: number;
  /** Id del documento (nómina) al que pertenece la línea. */
  readonly documento: number | null;
  readonly pago?: string | number | null;
  readonly total?: string | number | null;
}

/** Lo único que se le pide a la cabecera del documento para identificar el pago. */
export interface CreditoPagoDocumentoRead {
  readonly id: number;
  readonly numero: number | null;
  readonly fecha: string | null;
}
