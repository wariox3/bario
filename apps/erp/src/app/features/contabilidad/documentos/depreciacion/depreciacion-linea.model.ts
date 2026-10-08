import type { DocumentoDetalleReadBase } from '@reddoc/core';

/**
 * Modelos de la **línea de depreciación**: el cálculo del backend para un activo
 * fijo del documento.
 *
 * Comparte la tabla `documento-detalle` con las líneas de ítem y de cuenta (el
 * backend las discrimina por `tipo_registro`), pero en el front no comparte
 * nada con ellas: no se teclea ni se edita —la genera `cargar-activo/`— y lo
 * que muestra es el activo, no una imputación contable. Por eso vive acá y no
 * en `features/documentos/contable/`.
 *
 * Contrato **confirmado** contra una línea real: el backend serializa `activo`,
 * `activo_codigo`, `activo_nombre` y `dias`, y deja la depreciación del periodo
 * en `precio` (de `DocumentoDetalleReadBase`).
 *
 * ⚠️ El `total` de la línea vuelve en 0: el backend lo calcula como
 * cantidad × precio y deja `cantidad` en 0. No sirve para mostrar; el valor sale
 * de `precio`. Ver PENDIENTES §7.1.
 */

/** Línea de depreciación leída desde la API. */
export interface DepreciacionLineaRead extends DocumentoDetalleReadBase {
  /** FK del activo fijo (`contabilidad/activo`). */
  readonly activo?: number | null;
  readonly activo_codigo?: string | null;
  readonly activo_nombre?: string | null;
  /** Días depreciados en el mes que cubre el documento. */
  readonly dias?: number | null;
}

/**
 * Línea ya normalizada para pintar. Es un **view-model**, no un valor de
 * formulario: la tabla es de solo lectura y la única acción es eliminar, que
 * necesita el `id`.
 */
export interface DepreciacionLineaView {
  readonly id: number | null;
  readonly activo: number | null;
  readonly codigo: string;
  readonly nombre: string;
  readonly dias: number;
  readonly valor: number;
}
