import type { ErpSelectOption } from '@reddoc/core';

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

/** Fila tal como la pinta la tabla: el tipo traducido y cada cuenta lista para su selector. */
export interface ConfiguracionProvisionRow extends ConfiguracionProvision {
  readonly tipo_label: string;
  /** Las de seguridad social y parafiscales solo llevan débito. */
  readonly lleva_credito: boolean;
  readonly cuenta_debito_label: string;
  readonly cuenta_debito_option: ErpSelectOption | null;
  readonly cuenta_credito_label: string;
  readonly cuenta_credito_option: ErpSelectOption | null;
}

/** Campo de cuenta que se guarda al elegirla en la tabla. */
export type ProvisionCuentaCampo = 'cuenta_debito' | 'cuenta_credito';

/** El PATCH lleva solo la cuenta que cambió. */
export type ConfiguracionProvisionPayload = Partial<Record<ProvisionCuentaCampo, number>>;
