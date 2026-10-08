/**
 * Fila del informe **Historial de movimientos**
 * (`POST /inventario/informe/lista/`, `informe: 'historial_movimiento'`).
 *
 * Es una línea de documento que movió inventario, aplanada con datos de su
 * documento padre (número, tipo, fecha, contacto) y del ítem. A diferencia de
 * los otros tres informes del módulo —que muestran saldos a hoy— este muestra
 * el **movimiento que los produjo**, uno por línea.
 *
 * **Verificado contra la respuesta real** (2026-09-07). Los campos son
 * **planos** (`documento_numero`, `item_nombre`), no el lookup de Django que
 * había portado el ERP legacy (`documento__numero`): con esos nombres las
 * columnas salían vacías, porque `<lib-data-table>` resuelve con `row[field]`.
 *
 * Ojo con la asimetría: eso vale para **leer** la respuesta. Los `filtros` sí
 * viajan como rutas ORM, así que ahí el doble guion bajo es correcto.
 */
export interface HistorialMovimiento {
  readonly id: number;

  // ── El documento que produjo el movimiento ────────────────────────────────
  readonly documento_id: number | null;
  readonly documento_numero: number | string | null;
  /** Fecha del documento (`yyyy-MM-dd`). */
  readonly documento_fecha: string | null;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo_nombre: string | null;
  /** Tercero del documento. El informe trae el nombre, sin id ni identificación. */
  readonly contacto_nombre_corto: string | null;

  // ── Qué se movió y dónde ──────────────────────────────────────────────────
  readonly item_id: number | null;
  readonly item_codigo: string | null;
  readonly item_nombre: string | null;
  readonly almacen_id: number | null;
  readonly almacen_nombre: string | null;

  // ── Cantidades ────────────────────────────────────────────────────────────
  /** Cantidad de la línea, siempre positiva. */
  readonly cantidad: string | null;
  /**
   * Cantidad **con el signo del movimiento** aplicado (`cantidad ×
   * operacion_inventario`): positiva en las entradas y negativa en las salidas.
   * Es la que muestra la tabla, porque es la que suma.
   */
  readonly cantidad_operada: string | null;
  /**
   * Sentido del movimiento sobre cada saldo: `1` suma, `-1` resta, `0` no lo
   * toca. Son dos ejes independientes — una línea puede mover remisión sin
   * mover existencia, y ahí `cantidad_operada` queda en cero.
   *
   * No se pintan como columna: en crudo son números sin significado para quien
   * lee. Ver `PENDIENTES.md` §0 antes de darles una etiqueta.
   */
  readonly operacion_inventario: number | null;
  readonly operacion_remision: number | null;

  // ── Valores de la línea ───────────────────────────────────────────────────
  /** Costo unitario de la línea. */
  readonly costo: string | null;
  /** Precio unitario de la línea. */
  readonly precio: string | null;
  /** Texto escrito en la línea del documento. */
  readonly detalle: string | null;
}
