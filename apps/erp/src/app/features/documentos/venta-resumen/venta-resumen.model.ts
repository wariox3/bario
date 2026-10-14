/**
 * Período que acepta `GET general/documento/venta-resumen/?periodo=`. El rango
 * siempre es el del período **en curso** (mes o año actual, hora de Bogotá).
 */
export type VentaPeriodo = 'mes' | 'anio';

/**
 * Un punto de la serie: un día (`mes`) o un mes (`anio`, con `fecha` en su
 * día 1). Los montos llegan como string decimal (`"150.000000"`).
 */
export interface VentaResumenPunto {
  readonly fecha: string;
  readonly documentos: number;
  readonly subtotal: string;
  readonly impuesto: string;
  readonly total: string;
}

export interface VentaResumenTotales {
  readonly documentos: number;
  readonly subtotal: string;
  readonly impuesto: string;
  readonly total: string;
}

/**
 * Ventas del período: documentos de tipos con `venta=True`, aprobados y no
 * anulados, cada valor multiplicado por la `operacion` del tipo (la nota crédito
 * resta, así que un total puede ser negativo). La serie llega completa: los
 * días o meses sin ventas —incluidos los que aún no pasan— vienen en cero.
 */
export interface VentaResumen {
  readonly periodo: VentaPeriodo;
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly serie: readonly VentaResumenPunto[];
  readonly totales: VentaResumenTotales;
}
