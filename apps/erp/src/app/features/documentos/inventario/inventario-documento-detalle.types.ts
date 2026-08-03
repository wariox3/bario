import type { ErpSelectOption } from '@reddoc/core';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';

/**
 * Sentido del movimiento de una línea sobre su bodega: `1` suma existencias,
 * `-1` las resta.
 *
 * Solo lo declaran las líneas del **traslado**, que mueve stock entre bodegas y
 * por tanto necesita ambos sentidos en el mismo documento. En entrada y salida
 * el sentido lo fija el tipo de documento (`inventoryEffect`) y la columna ni
 * siquiera se muestra.
 */
export type OperacionInventario = 1 | -1;

/**
 * Valores crudos de una línea de detalle de **inventario** (`form.getRawValue()`
 * de cada `FormGroup` del `FormArray`). Compartido por los documentos que mueven
 * stock sobre el endpoint genérico —entrada, salida y traslado de almacén—, que
 * en el ERP legacy declaran exactamente la misma línea.
 *
 * Diferencias con la línea **comercial**: no hay impuestos ni descuento (un
 * movimiento de almacén no factura), y sí hay **almacén por línea** — cada línea
 * puede entrar a una bodega distinta de la de la cabecera.
 *
 * Cálculo por línea (front autoritativo, vía `@reddoc/core/calculo`):
 *   total = cantidad × precio   ·   subtotal = total (sin impuestos)
 */
export interface InventarioDetalleFormRawValue {
  /** Id de la línea persistida (`null` mientras no exista en backend). */
  readonly id: number | null;
  readonly item: ItemOption | null;
  /** Bodega a la que entra/sale la línea. Hereda la de la cabecera al agregar. */
  readonly almacen: ErpSelectOption | null;
  /**
   * Sentido del movimiento sobre la bodega de la línea. Siempre presente en el
   * form (default `1`), pero solo lo edita —y lo envía— el traslado.
   */
  readonly operacion_inventario: OperacionInventario;
  readonly cantidad: number | null;
  /**
   * Costo unitario. Se autollena con el `costo` del ítem (no con su precio de
   * venta) y queda editable — un movimiento de almacén se valoriza al costo.
   */
  readonly precio: number | null;
}

/**
 * Totales del documento de inventario: cantidad acumulada y valorización.
 *
 * Sin impuestos ni descuento, `subtotal` y `total` coinciden; se exponen los dos
 * porque el pie del legacy los muestra por separado y el backend guarda ambos.
 */
export interface ResumenInventario {
  /** Suma de las cantidades de todas las líneas. */
  readonly cantidad: number;
  readonly subtotal: number;
  readonly total: number;
}
