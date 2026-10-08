/**
 * Fila del informe **Inventario valorizado**
 * (`POST /inventario/informe/lista/`, `informe: 'inventario_valorizado'`).
 *
 * Es la fila de `Existencia` más la valorización: el costo promedio ponderado
 * de la unidad y el costo total de las existencias. El grano sigue siendo el
 * ítem (saldo consolidado, sin desglose por almacén).
 *
 * Backend lo describe como «lo mismo que existencia, con costo promedio y costo
 * total», y esta fila ya usa los mismos nombres **planos** que
 * `InvExistenciaInforme` —el único serializer de la familia que el schema
 * declara—, así que es la menos arriesgada de las tres sin confirmar.
 *
 * Si el informe replica `existencia`, le faltarían acá `negativo` e `inactivo`.
 * Pendiente de confirmar la lista de campos con backend.
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
