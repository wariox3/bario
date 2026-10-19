/**
 * Impuesto (`GenImpuesto`).
 *
 * Catálogo **normativo**: los impuestos los siembra el backend por fixture y no
 * se crean ni se borran desde la API. Lo único que cada tenant configura es la
 * cuenta contable donde se registra, y eso es lo único que acepta el PATCH.
 *
 * `cuenta` es nullable: un impuesto sin cuenta asignada es un estado legítimo.
 * En ese caso `cuenta_codigo` y `cuenta_nombre` llegan vacíos aunque el schema
 * los marque obligatorios, por eso van tipados con `null`.
 */
export interface Impuesto {
  readonly id: number;
  readonly nombre: string;
  readonly nombre_extendido: string;
  /** Decimal serializado como string (`"19.00"`). */
  readonly porcentaje: string;
  /** Decimal serializado como string (`"100.00"`). */
  readonly porcentaje_base: string;
  readonly operacion: number;
  readonly venta: boolean;
  readonly compra: boolean;
  readonly impuesto_tipo: number | null;
  readonly impuesto_tipo_nombre: string;
  readonly cuenta: number | null;
  readonly cuenta_codigo: string | null;
  readonly cuenta_nombre: string | null;
}

/** Fila tal como la pinta la tabla: el impuesto más la cuenta aplanada a `código - nombre`. */
export interface ImpuestoRow extends Impuesto {
  readonly cuenta_label: string;
}

/** Lo escribible de un impuesto (`PatchedGenImpuestoActualizarRequest`). */
export interface ImpuestoPayload {
  readonly cuenta: number | null;
}

/** Respuesta del PATCH (`GenImpuestoActualizar`): devuelve solo lo escrito. */
export interface ImpuestoActualizado extends ImpuestoPayload {
  readonly id: number;
}
