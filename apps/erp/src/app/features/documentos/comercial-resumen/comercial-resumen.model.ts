import type { ResumenPeriodo } from '../resumen-periodo/resumen-periodo';

/** Qué movimiento resume la gráfica: ventas o compras. */
export type ComercialTipo = 'venta' | 'compra';

/**
 * Un punto de la serie: un día (`mes`) o un mes (`anio`, con `fecha` en su
 * día 1). Los montos llegan como string decimal (`"150.000000"`).
 */
export interface ComercialResumenPunto {
  readonly fecha: string;
  readonly documentos: number;
  readonly subtotal: string;
  readonly impuesto: string;
  readonly total: string;
}

export interface ComercialResumenTotales {
  readonly documentos: number;
  readonly subtotal: string;
  readonly impuesto: string;
  readonly total: string;
}

/**
 * Ventas o compras del período: documentos de tipos con `venta=True` (o
 * `compra=True`), aprobados y no anulados, cada valor multiplicado por la
 * `operacion` del tipo (las notas crédito restan, así que un total puede ser
 * negativo). La serie llega completa: los días o meses sin movimiento —incluidos
 * los que aún no pasan— vienen en cero.
 */
export interface ComercialResumen {
  readonly periodo: ResumenPeriodo;
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly serie: readonly ComercialResumenPunto[];
  readonly totales: ComercialResumenTotales;
}
