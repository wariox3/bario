/**
 * Configuración de provisión (`HumConfiguracionProvision`).
 *
 * Una fila por tipo de provisión × tipo de costo, sembrada por el backend. Cada
 * empresa configura la cuenta débito (el gasto) y la crédito (el pasivo) con que
 * se contabiliza la provisión.
 */
export interface ConfiguracionProvision {
  readonly id: number;
  /** Código fijo de la provisión (`CESANTIA`, `PRIMA`, `PENSION`…). */
  readonly tipo: string;
  readonly orden: number;
  readonly tipo_costo: number;
  readonly tipo_costo_nombre: string;
  readonly cuenta_debito: number | null;
  readonly cuenta_debito_codigo: string | null;
  readonly cuenta_debito_nombre: string | null;
  readonly cuenta_credito: number | null;
  readonly cuenta_credito_codigo: string | null;
  readonly cuenta_credito_nombre: string | null;
}

/** Fila tal como la pinta la tabla: el tipo traducido y las cuentas aplanadas. */
export interface ConfiguracionProvisionRow extends ConfiguracionProvision {
  readonly tipo_label: string;
  readonly cuenta_debito_label: string;
  readonly cuenta_credito_label: string;
}

export interface ConfiguracionProvisionPayload {
  readonly cuenta_debito: number | null;
  readonly cuenta_credito?: number | null;
}
