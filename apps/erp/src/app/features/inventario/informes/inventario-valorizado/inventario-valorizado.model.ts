/**
 * Fila del informe **Inventario valorizado**
 * (`POST /general/item/lista/`, `serializador: 'informe_inventario_valorizado'`).
 *
 * Es la fila de `Existencia` más la valorización: el costo promedio ponderado
 * de la unidad y el costo total de las existencias. El grano sigue siendo el
 * ítem (saldo consolidado, sin desglose por almacén).
 *
 * **Supuesto pendiente de confirmar con backend**: que el serializador
 * `informe_inventario_valorizado` exista en el API nuevo y devuelva
 * `costo_promedio` y `costo_total` junto a los saldos. En el ERP legacy el
 * serializador viajaba como query param del `GET general/item/`.
 */
export interface InventarioValorizado {
  readonly id: number;
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly referencia: string | null;
  /** Unidades en almacén. */
  readonly existencia: number | string | null;
  /** Unidades comprometidas en remisiones (salidas pendientes de facturar). */
  readonly remision: number | string | null;
  /** Existencia menos remisión. */
  readonly disponible: number | string | null;
  /** Costo promedio ponderado de la unidad. */
  readonly costo_promedio: number | string | null;
  /** Valorización de las existencias (existencia × costo promedio). */
  readonly costo_total: number | string | null;
}
