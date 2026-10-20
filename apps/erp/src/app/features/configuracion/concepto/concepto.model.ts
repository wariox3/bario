/**
 * Concepto de nómina del catálogo (`HumConcepto`), tal como lo devuelve
 * `GET /humano/concepto/configuracion/`.
 *
 * En la configuración solo se lista: lo que cada empresa ajusta de un concepto
 * es su cuenta contable por tipo de costo, que vive en otro recurso.
 */
export interface Concepto {
  readonly id: number;
  readonly nombre: string;
  /** Decimal serializado como string (`"100.000"`). */
  readonly porcentaje: string;
  /** `1` devengado, `-1` deducción, `0` informativo. */
  readonly operacion: number;
  readonly orden: number;
  readonly adicional: boolean;
  readonly ingreso_base_prestacion: boolean;
  readonly ingreso_base_prestacion_vacacion: boolean;
  readonly ingreso_base_cotizacion: boolean;
  readonly concepto_tipo: number | null;
  readonly concepto_tipo_nombre: string | null;
}

/** Fila tal como la pinta la tabla: el concepto más el porcentaje con su `%`. */
export interface ConceptoRow extends Concepto {
  readonly porcentaje_label: string;
}
