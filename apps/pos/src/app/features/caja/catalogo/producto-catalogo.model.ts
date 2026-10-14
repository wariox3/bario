/**
 * Un ítem tal como lo pinta y lo vende la caja: los montos ya como número y el
 * stock resuelto. Sale de `Item` (`@reddoc/core`) con `itemToProductoCatalogo`.
 */
export interface ProductoCatalogo {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  /** Precio de venta propio del ítem; la lista del cliente lo puede pisar al agregarlo. */
  readonly precio: number;
  readonly favorito: boolean;
  /**
   * Unidades que se pueden vender, o `null` si el ítem no controla stock (un
   * servicio, un ítem sin inventario o uno que admite saldo negativo).
   */
  readonly disponible: number | null;
  readonly imagenUrl: string | null;
}

/** El producto controla stock y ya no le queda. */
export function estaAgotado(producto: ProductoCatalogo): boolean {
  return producto.disponible !== null && producto.disponible <= 0;
}
