/**
 * Fila del informe **Existencias**
 * (`POST /inventario/informe/lista/`, `informe: 'existencia'`).
 *
 * **Verificado contra el schema** (`InvExistenciaInforme`): una fila por ítem con
 * el saldo consolidado de todos los almacenes.
 *
 * Los tres saldos son los **del ítem**, no los de un almacén: quien mueve
 * inventario escribe en la misma transacción la fila del almacén y el acumulado
 * del ítem, y este informe lee el segundo. Abrirlo por almacén es
 * `existencia_almacen`.
 *
 * Acá no hay costo: cantidades y nada más. La valorización es
 * `inventario_valorizado`, que es este mismo informe con las columnas de costo.
 *
 * Convención del backend: las cantidades viajan como `string` decimal
 * (`"12.000000"`).
 */
export interface Existencia {
  readonly id: number;
  readonly codigo: string | null;
  readonly nombre: string | null;
  readonly referencia: string | null;
  /** Unidades en almacén. */
  readonly existencia: string | null;
  /** Unidades comprometidas en remisiones (salidas pendientes de facturar). */
  readonly remision: string | null;
  /** Existencia menos remisión: lo que realmente se puede comprometer. */
  readonly disponible: string | null;
  /** El saldo quedó en negativo — se sacó más de lo que había registrado. */
  readonly negativo: boolean;
  /** El ítem está inactivo pero todavía tiene saldo. */
  readonly inactivo: boolean;
}
