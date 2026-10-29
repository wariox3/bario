/** Las filas de la cascada, en el orden en que el backend las manda. */
export type ClaveCascada =
  | 'ventas'
  | 'costo_ventas'
  | 'utilidad_bruta'
  | 'gastos_operacion'
  | 'utilidad_operacional'
  | 'otros_netos'
  | 'impuestos'
  | 'utilidad_neta';

/** `entrada` y `salida` suman al acumulado; `subtotal` y `total` lo muestran. */
export type TipoCascada = 'entrada' | 'salida' | 'subtotal' | 'total';

export interface FilaCascada {
  readonly clave: ClaveCascada;
  /** Rótulo del backend: solo de respaldo si llega una clave que el front no conoce. */
  readonly etiqueta: string;
  /** Las salidas llegan negativas. */
  readonly valor: number;
  readonly tipo: TipoCascada;
}

export interface EstadoResultadosTarjetas {
  /** Ventas (grupo 41) más otros ingresos (grupo 42). */
  readonly vendimos: number;
  /** Costo de ventas, gastos de operación, otros gastos (53) e impuestos. */
  readonly gastamos: number;
  /** Utilidad neta: `vendimos − gastamos`. */
  readonly nos_quedo: number;
  /** `nos_quedo / ventas × 100`; nulo si no hubo ventas. */
  readonly margen_neto: number | null;
}

/** Las cifras de las tarjetas para el mismo rango del año anterior. */
export interface EstadoResultadosComparativo {
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly vendimos: number;
  readonly gastamos: number;
  readonly nos_quedo: number;
}

/**
 * Respuesta de `GET contabilidad/tablero/estado-resultados/`: el estado de
 * resultados del rango sobre `con_movimiento`, sin asientos de cierre.
 */
export interface EstadoResultadosTablero {
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly tarjetas: EstadoResultadosTarjetas;
  readonly cascada: readonly FilaCascada[];
  readonly comparativo: EstadoResultadosComparativo;
}
