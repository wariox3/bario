/**
 * Línea de una lista de precios: el precio que un ítem toma dentro de esa lista.
 *
 * Ojo con los nombres del backend, que se prestan a confusión: **`precio` es la
 * FK a la lista** (no un importe) y el importe es **`vr_precio`**. Se conservan
 * tal cual porque son el contrato del recurso `general/precio-detalle/`.
 */

/**
 * Fila cruda tal como la devuelve `general/precio-detalle/`.
 *
 * Dos cosas que no se pueden usar directo y por eso existe este tipo aparte del
 * read-model:
 *
 * - **`vr_precio` viaja como string** (`DecimalField` de DRF, `"120600.00"`).
 * - **`item` es nullable**: el backend acepta una línea sin ítem, así que puede
 *   volver del listado y hay que poder pintarla.
 *
 * `item_nombre`, `item_codigo` e `item_referencia` son de solo lectura: los
 * aplana el serializador desde la FK.
 */
export interface PrecioDetalleApi {
  readonly id: number;
  readonly precio: number;
  readonly item: number | null;
  readonly item_nombre: string;
  readonly item_codigo: string;
  readonly item_referencia: string;
  readonly vr_precio?: string;
}

/** Read-model de una línea, ya normalizado para la tabla. */
export interface PrecioDetalle {
  readonly id: number;
  /** FK a la lista de precios dueña de la línea. */
  readonly precio: number;
  /** FK al ítem. `null` en las líneas que el backend admite sin ítem. */
  readonly item: number | null;
  readonly itemNombre: string;
  readonly itemCodigo: string;
  readonly itemReferencia: string;
  /** El importe de la línea, ya como número. */
  readonly vrPrecio: number;
}

/**
 * Cuerpo de `POST`/`PUT` de una línea.
 *
 * `vr_precio` sale como string a propósito: es lo que declara el contrato para
 * un `DecimalField`, y así el importe no pasa por el redondeo binario de un
 * `number` en el camino.
 */
export interface PrecioDetallePayload {
  readonly precio: number;
  readonly item: number | null;
  readonly vr_precio: string;
}
