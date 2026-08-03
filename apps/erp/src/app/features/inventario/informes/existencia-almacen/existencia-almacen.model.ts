/**
 * Fila del informe **Existencias por almacén** (`POST /inventario/existencia/lista/`).
 *
 * A diferencia de `Existencia` (una fila por ítem, saldo consolidado), acá el
 * grano es **ítem × almacén**: el mismo ítem aparece una vez por cada almacén
 * donde tiene movimiento.
 *
 * **Supuestos pendientes de confirmar con backend**: los nombres aplanados de
 * los relacionales. El ERP legacy los declaraba con lookup de Django
 * (`item__nombre`, `almacen__nombre`) y su tabla pintaba las llaves crudas de
 * la respuesta, así que se replican tal cual. Si el API nuevo los devuelve
 * aplanados (`item_nombre`), el fix es local: `existencia-almacen.constants.ts`
 * y este archivo.
 */
export interface ExistenciaAlmacen {
  readonly id: number;
  readonly item__nombre: string | null;
  readonly almacen__nombre: string | null;
  /** Unidades en ese almacén. */
  readonly existencia: number | string | null;
  /** Unidades comprometidas en remisiones desde ese almacén. */
  readonly remision: number | string | null;
  /** Existencia menos remisión. */
  readonly disponible: number | string | null;
}
