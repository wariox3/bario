/**
 * Cuenta contable de un concepto según el tipo de costo del contrato
 * (`HumConceptoCuenta`).
 *
 * Un concepto lleva a lo sumo una cuenta por tipo de costo: al contabilizar la
 * nómina, cada línea va a la cuenta del concepto que corresponde al tipo de
 * costo de su contrato.
 *
 * PENDIENTE (backend): la forma la tomamos del legacy con la convención de
 * nombres del backend nuevo (la misma de la configuración de provisión). Hay que
 * confirmarla contra la respuesta real.
 */
export interface ConceptoCuenta {
  readonly id: number;
  readonly concepto: number;
  readonly tipo_costo: number;
  readonly tipo_costo_nombre: string;
  readonly cuenta: number;
  readonly cuenta_codigo: string | null;
  readonly cuenta_nombre: string | null;
}

export interface ConceptoCuentaCrearPayload {
  readonly concepto: number;
  readonly tipo_costo: number;
  readonly cuenta: number;
}

export interface ConceptoCuentaActualizarPayload {
  readonly cuenta: number;
}
