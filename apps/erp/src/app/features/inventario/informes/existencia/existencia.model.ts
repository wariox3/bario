/**
 * Fila del informe **Existencias** (`POST /general/item/lista/`).
 *
 * Es un ítem del master de General enriquecido con sus saldos de inventario.
 * El informe solo mira los ítems que manejan inventario (`inventario = true`,
 * filtro implícito del servicio), así que la fila no repite ese flag.
 *
 * **Supuesto pendiente de confirmar con backend**: que `existencia`, `remision`
 * y `disponible` viajen en el listado del ítem. En el ERP legacy salían del
 * `GET general/item/` plano; puede que el API nuevo los exponga solo bajo el
 * serializador `informe_existencia`. Si fuera así, el fix es local: mandar
 * `serializador` en el body de `ExistenciaService.list`.
 *
 * Convención del backend: los ids viajan como `number`; las cantidades como
 * `string` con cola de decimales (`"12.000000"`) o `number` según el campo.
 */
export interface Existencia {
  readonly id: number;
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly referencia: string | null;
  /** Unidades en almacén. */
  readonly existencia: number | string | null;
  /** Unidades comprometidas en remisiones (salidas pendientes de facturar). */
  readonly remision: number | string | null;
  /** Existencia menos remisión: lo que realmente se puede comprometer. */
  readonly disponible: number | string | null;
}
