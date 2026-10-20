/**
 * Activo fijo (ConActivo).
 *
 * Shape de lectura del backend. Las FK llegan como id pelado (sin sufijo `_id`)
 * + companion `*_nombre` (y `*_codigo` para las cuentas contables). Los montos
 * (`valor_compra`, `depreciacion_inicial`) pueden llegar como string Decimal →
 * se normalizan a número en el mapper.
 */
export interface Activo {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly marca: string | null;
  readonly serie: string | null;
  readonly modelo: number | null;
  readonly fecha_compra: string | null;
  readonly fecha_activacion: string | null;
  readonly fecha_baja: string | null;
  readonly duracion: number | null;
  readonly valor_compra: string | number | null;
  readonly depreciacion_inicial: string | number | null;
  // Calculados por el backend (solo lectura)
  readonly depreciacion_periodo?: string | number | null;
  readonly depreciacion_saldo?: string | number | null;
  // Foreign keys (id pelado) + companion `*_nombre` / `*_codigo`
  readonly activo_grupo: number | null;
  readonly activo_grupo_nombre?: string | null;
  readonly metodo_depreciacion: number | null;
  readonly metodo_depreciacion_nombre?: string | null;
  readonly cuenta_gasto: number | null;
  readonly cuenta_gasto_nombre?: string | null;
  readonly cuenta_gasto_codigo?: string | null;
  readonly cuenta_depreciacion: number | null;
  readonly cuenta_depreciacion_nombre?: string | null;
  readonly cuenta_depreciacion_codigo?: string | null;
  readonly centro_costo: number | null;
  readonly centro_costo_nombre?: string | null;
}

/** Payload para crear o actualizar un activo. Las FK van como id pelado. */
export interface ActivoPayload {
  nombre: string;
  codigo: string;
  marca: string | null;
  serie: string | null;
  modelo: number | null;
  fecha_compra: string | null;
  fecha_activacion: string | null;
  fecha_baja: string | null;
  duracion: number | null;
  valor_compra: number | null;
  depreciacion_inicial: number | null;
  activo_grupo: number | null;
  metodo_depreciacion: number | null;
  cuenta_gasto: number | null;
  cuenta_depreciacion: number | null;
  centro_costo: number | null;
}
