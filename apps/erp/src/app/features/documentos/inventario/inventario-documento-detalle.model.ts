import type { DocumentoDetalleReadBase } from '@reddoc/core';

/**
 * Modelos de lectura/escritura de una línea de **inventario**, transversales a
 * los documentos que mueven stock (entrada y, más adelante, salida y traslado).
 * Comparten el endpoint `/general/documento-detalle/` con las líneas comerciales
 * y contables; el backend las discrimina por `tipo_registro` (`'I'` = ítem).
 *
 * ⚠️ Contrato **supuesto** a partir del ERP legacy: allí las líneas viajaban
 * embebidas en el POST monolítico de `general/documento/nuevo/`, no contra
 * `documento-detalle`. Lo asumido es que la línea acepta/devuelve `almacen` (+
 * `almacen_nombre`) y que no exige `impuestos_ids`. Todo el riesgo del contrato
 * queda aislado en este archivo y en el mapper.
 */

/** Línea de inventario leída desde la API en edición. */
export interface InventarioDetalleRead extends DocumentoDetalleReadBase {
  /** FK de la bodega de la línea. */
  readonly almacen?: number | null;
  /** Nombre de la bodega, para etiquetar el select al cargar en edición. */
  readonly almacen_nombre?: string | null;
}

/**
 * Cuerpo de una línea de inventario enviada en `POST`/`PATCH`.
 *
 * No extiende `DocumentoDetallePayloadBase` porque ese contrato exige
 * `impuestos_ids`, que un movimiento de almacén no tiene. El legacy además
 * enviaba `subtotal` y `total_bruto`; se omiten porque sin impuestos son iguales
 * a `total` y el backend los recalcula.
 */
export interface InventarioDetallePayload {
  /** Marca la línea como ítem de inventario (no cuenta contable). */
  readonly tipo_registro: 'I';
  readonly item: number | null;
  readonly almacen: number | null;
  readonly cantidad: number | null;
  /** Costo unitario como string con 2 decimales (`"1000000.00"`). */
  readonly precio: string;
  /** Valorización de la línea (`cantidad × precio`) como string con 2 decimales. */
  readonly total: string;
}
