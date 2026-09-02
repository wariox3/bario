/**
 * Item: productos y servicios que la empresa compra y/o vende.
 * El backend discrimina entre producto y servicio con los flags `producto`
 * y `servicio` (excluyentes).
 *
 * Shape de lectura: los relacionales de cuenta contable viajan con el id del FK
 * (`cuenta_venta`, etc.) y un acompañante `<campo>_nombre`/`<campo>_codigo` para
 * mostrar. Los impuestos llegan como una lista de items relacionados.
 */
export interface Item {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly referencia: string | null;
  readonly precio: number;
  readonly costo: number;
  /**
   * Costo promedio ponderado de las existencias. Lo usan las salidas de almacén
   * para valorizar la línea. Opcional: campo **supuesto** a partir del ERP
   * legacy, pendiente de confirmar en el read del ítem del API nuevo.
   */
  readonly costo_promedio?: number | null;
  readonly producto: boolean;
  readonly servicio: boolean;
  readonly inventario: boolean;
  readonly negativo: boolean;
  readonly venta: boolean;
  readonly favorito: boolean;
  readonly inactivo: boolean;
  readonly cuenta_venta: number | null;
  readonly cuenta_venta_nombre?: string | null;
  readonly cuenta_venta_codigo?: string | null;
  readonly cuenta_compra: number | null;
  readonly cuenta_compra_nombre?: string | null;
  readonly cuenta_compra_codigo?: string | null;
  readonly cuenta_costo_venta: number | null;
  readonly cuenta_costo_venta_nombre?: string | null;
  readonly cuenta_costo_venta_codigo?: string | null;
  readonly cuenta_inventario: number | null;
  readonly cuenta_inventario_nombre?: string | null;
  readonly cuenta_inventario_codigo?: string | null;
  readonly impuestos?: readonly ItemImpuesto[];
  /**
   * Imagen del item. Se asume URL absoluta lista para `<img>`. Si el backend la
   * devuelve como ruta relativa, anteponer la base en el único punto que la lee
   * (`imageUrl` en `ItemDetailComponent`).
   */
  readonly imagen?: string | null;
}

/**
 * Impuesto asociado a un item. El backend lo devuelve con el id del impuesto y
 * sus flags venta/compra para poder reagruparlos en el formulario.
 */
export interface ItemImpuesto {
  readonly id?: number;
  readonly impuesto: number;
  /** Nombre corto (`"IVA"`). Para mostrar se prefiere `impuesto_nombre_extendido`. */
  readonly impuesto_nombre?: string | null;
  /** Nombre para mostrar (`"IVA 19% ventas"`). */
  readonly impuesto_nombre_extendido?: string | null;
  readonly impuesto_venta?: boolean;
  readonly impuesto_compra?: boolean;
  /** Operación sobre el total: `1` suma (IVA…), `-1` resta (retenciones). */
  readonly impuesto_operacion?: number;
  /** Porcentaje del impuesto, e.g. `"19.00"`. */
  readonly impuesto_porcentaje?: string | null;
  /** Porcentaje de la base sobre la que aplica, e.g. `"100.00"` o `"10.00"` para AIU. */
  readonly impuesto_porcentaje_base?: string | null;
}

/** Payload para crear o actualizar un item. */
export interface ItemPayload {
  readonly codigo: string;
  readonly nombre: string;
  readonly referencia: string | null;
  readonly precio: number;
  readonly costo: number;
  readonly producto: boolean;
  readonly servicio: boolean;
  readonly inventario: boolean;
  readonly negativo: boolean;
  readonly venta: boolean;
  readonly favorito: boolean;
  readonly inactivo: boolean;
  readonly cuenta_venta: number | null;
  readonly cuenta_compra: number | null;
  readonly cuenta_costo_venta: number | null;
  readonly cuenta_inventario: number | null;
  /** Ids de impuesto (unión deduplicada de venta + compra). */
  readonly impuestos_ids: readonly number[];
}
