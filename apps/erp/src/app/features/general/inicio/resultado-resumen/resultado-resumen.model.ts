import type { ResumenPeriodo } from '@erp/features/documentos/resumen-periodo/resumen-periodo';

/**
 * Un punto de la serie: un día (`mes`) o un mes (`anio`, con `fecha` en su
 * día 1). Montos como string decimal (`"150.000000"`).
 */
export interface ResultadoResumenPunto {
  readonly fecha: string;
  /** Subtotal neto de las ventas: los documentos de `tablero/venta/`. */
  readonly ingreso: string;
  /** Subtotal neto de las compras: los documentos de `tablero/compra/`. */
  readonly egreso: string;
}

export interface ResultadoResumenTotales {
  readonly ingreso: string;
  readonly egreso: string;
  /** `ingreso - egreso`. */
  readonly diferencia: string;
}

/**
 * Respuesta de `GET general/tablero/resultado/?periodo=`: ingresos
 * contra egresos del período en curso, **antes de impuestos** (el IVA no es
 * ingreso ni gasto). El schema no tipa la respuesta: la forma sigue a la de
 * `tablero/venta/` con los campos que declara su descripción.
 */
export interface ResultadoResumen {
  readonly periodo: ResumenPeriodo;
  readonly fecha_desde: string;
  readonly fecha_hasta: string;
  readonly serie: readonly ResultadoResumenPunto[];
  readonly totales: ResultadoResumenTotales;
}
