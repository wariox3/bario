/**
 * Línea de una lista de precios: el precio que un ítem toma dentro de esa lista.
 *
 * Ojo con los nombres del backend, que se prestan a confusión: **`precio` es la
 * FK a la lista** (no un importe) y el importe es **`vr_precio`**. Se conservan
 * tal cual porque son el contrato del recurso `general/precio_detalle/`.
 */
export interface PrecioDetalle {
  readonly id: number;
  /** FK a la lista de precios dueña de la línea. */
  readonly precio: number;
  /** FK al ítem. */
  readonly item: number;
  /** Nombre del ítem, aplanado por el serializador. */
  readonly item__nombre: string;
  /** El importe de la línea. */
  readonly vr_precio: number;
}

/** Cuerpo de `POST`/`PUT` de una línea. */
export interface PrecioDetallePayload {
  readonly precio: number;
  readonly item: number;
  readonly vr_precio: number;
}
