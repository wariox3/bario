/**
 * Configuración de aporte (`HumConfiguracionAporte`).
 *
 * Una fila por aporte a seguridad social y parafiscales (pensión, salud, caja,
 * riesgo, SENA, ICBF). Las siembra el backend: no se crean ni se borran, lo único
 * que cada empresa configura es la cuenta contable con que se contabiliza el
 * aporte.
 */
export interface ConfiguracionAporte {
  readonly id: number;
  /** Código fijo del aporte (`PENSION`, `SALUD`…). */
  readonly tipo: string;
  readonly orden: number;
  readonly cuenta: number | null;
  readonly cuenta_codigo: string | null;
  readonly cuenta_nombre: string | null;
}

/** Fila tal como la pinta la tabla: el tipo traducido y la cuenta aplanada. */
export interface ConfiguracionAporteRow extends ConfiguracionAporte {
  readonly tipo_label: string;
  readonly cuenta_label: string;
}

export interface ConfiguracionAportePayload {
  readonly cuenta: number | null;
}
