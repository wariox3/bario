/**
 * Fila del informe **Existencias por almacén**
 * (`POST /inventario/informe/lista/`, `informe: 'existencia_almacen'`).
 *
 * A diferencia de `Existencia` (una fila por ítem, saldo consolidado), acá el
 * grano es **ítem × almacén**: el mismo ítem aparece una vez por cada almacén
 * donde tiene movimiento.
 *
 * **Verificado contra la respuesta real** (2026-09-14). Las relaciones llegan
 * aplanadas (`item_nombre`, `almacen_nombre`), igual que en
 * `historial_movimiento`; los **filtros** siguen siendo rutas ORM con doble
 * guion bajo (ver las constantes).
 *
 * Convención del backend: cantidades y costo viajan como `string` decimal
 * (`"200.000000"`).
 */
export interface ExistenciaAlmacen {
  readonly id: number;
  readonly item_id: number;
  readonly item_codigo: string | null;
  readonly item_nombre: string | null;
  readonly item_referencia: string | null;
  readonly almacen_id: number;
  readonly almacen_nombre: string | null;
  /** Unidades en ese almacén. */
  readonly existencia: string | null;
  /** Unidades comprometidas en remisiones desde ese almacén. */
  readonly remision: string | null;
  /** Existencia menos remisión. */
  readonly disponible: string | null;
  /** Costo promedio ponderado de la unidad en ese almacén. */
  readonly costo_promedio: string | null;
}
