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
 * Traslado de movimientos entre cuentas: todos los movimientos de la cuenta
 * origen pasan a la cuenta destino. Es irreversible.
 *
 * Las FK van **sin sufijo `_id`**, la convención del backend nuevo. El ERP
 * anterior las mandaba como `cuenta_origen_id` / `cuenta_destino_id` y con esos
 * nombres el endpoint responde «Este campo es requerido» para los dos.
 */
export interface CuentaTrasladoPayload {
  readonly cuenta_origen: number;
  readonly cuenta_destino: number;
}

/**
 * Respuesta del traslado: cuánto movió, contado por tipo de registro. Los dos en
 * cero significan que la cuenta origen no tenía nada — no es un error.
 */
export interface CuentaTrasladoResponse {
  /** Movimientos contables reasignados. */
  readonly movimientos: number;
  /** Líneas de documento reasignadas. */
  readonly documentos_detalles: number;
}
