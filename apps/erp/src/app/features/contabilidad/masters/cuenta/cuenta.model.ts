/**
 * Cuenta del PUC (subcuenta/auxiliar). Cuelga de la jerarquía
 * `clase → grupo → cuenta`. Las FK se leen/escriben sin sufijo `_id` (convención
 * del backend) y traen su companion `*_nombre` para pintar etiquetas.
 */
export interface Cuenta {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly exige_base: boolean;
  readonly exige_contacto: boolean;
  readonly exige_grupo: boolean;
  readonly permite_movimiento: boolean;
  readonly cuenta_clase: number | null;
  readonly cuenta_clase_nombre: string | null;
  readonly cuenta_grupo: number | null;
  readonly cuenta_grupo_nombre: string | null;
  readonly cuenta_cuenta: number | null;
  readonly cuenta_cuenta_nombre: string | null;
}

/** Write-model para crear/editar una cuenta. FK como id pelado. */
export interface CuentaPayload {
  readonly codigo: string | null;
  readonly nombre: string;
  readonly exige_base: boolean;
  readonly exige_contacto: boolean;
  readonly exige_grupo: boolean;
  readonly permite_movimiento: boolean;
  readonly cuenta_clase: number | null;
  readonly cuenta_grupo: number | null;
  readonly cuenta_cuenta: number | null;
}

/**
 * Respuesta del endpoint de importación masiva.
 * Shape provisional: crece cuando el backend defina su contrato final.
 */
export interface CuentaImportResult {
  readonly imported_count: number;
  readonly errors?: ReadonlyArray<{
    readonly row: number;
    readonly field?: string;
    readonly message: string;
  }>;
}
