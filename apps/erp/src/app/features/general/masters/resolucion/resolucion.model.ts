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

/**
 * Resolución que el servicio de facturación electrónica tiene del emisor de la
 * empresa (`lista-dian/`). Su `id` es el del servicio, no el de `GenResolucion`:
 * es el que pide `importar-dian/`.
 */
export interface ResolucionDian {
  readonly id: number;
  readonly emisor: number;
  readonly tipo_factura: number;
  readonly numero_resolucion: string;
  readonly fecha_resolucion: string | null;
  readonly prefijo: string;
  readonly rango_desde: number;
  readonly rango_hasta: number;
  readonly consecutivo_actual: number;
  readonly vigente_desde: string | null;
  readonly vigente_hasta: string | null;
  readonly activa: boolean;
}

/** Fila del modal "Lista": la de la DIAN más si la empresa ya la tiene. */
export interface ResolucionDianRow extends ResolucionDian {
  readonly importada: boolean;
}

/** Respuesta de `lista-dian/`: sin `next`/`previous`, solo `count` y `results`. */
export interface ResolucionDianPage {
  readonly count: number;
  readonly results: readonly ResolucionDian[];
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
