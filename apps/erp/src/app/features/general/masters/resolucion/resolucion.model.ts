/**
 * Resolución de facturación (GenResolucion).
 *
 * Define el rango de consecutivos y vigencia de una resolución DIAN. Los flags
 * `venta` / `compra` indican a qué módulo aplica; **no los edita el usuario**:
 * se derivan del módulo desde el que se accede (ver `ResolucionTipo`). Las
 * fechas viajan como ISO `yyyy-mm-dd` (o `null`).
 */
export interface Resolucion {
  readonly id: number;
  readonly prefijo: string;
  readonly numero: string;
  readonly consecutivo_desde: number;
  readonly consecutivo_hasta: number;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly venta: boolean;
  readonly compra: boolean;
  /** Lo marca `validar/` según lo que responda la DIAN. Solo lectura. */
  readonly estado_validado: boolean;
  /** Vencida: `validar/` la inactiva al pasar su `fecha_hasta`. */
  readonly estado_inactivo: boolean;
}

/** Payload para crear o actualizar una resolución. */
export interface ResolucionPayload {
  prefijo: string;
  numero: string;
  consecutivo_desde: number | null;
  consecutivo_hasta: number | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  venta: boolean;
  compra: boolean;
}

/**
 * Contexto de la resolución, derivado del módulo activo (Venta / Compra).
 * Determina el flag `venta`/`compra` del payload y el filtro fijo del listado.
 */
export type ResolucionTipo = 'venta' | 'compra';
