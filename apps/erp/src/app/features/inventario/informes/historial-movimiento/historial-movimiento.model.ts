/**
 * Fila del informe **Historial de movimientos**
 * (`POST /general/documento-detalle/lista/`, `serializador: 'informe_inventario'`).
 *
 * Es una línea de documento que movió inventario, aplanada con datos de su
 * documento padre (número, tipo, fecha, contacto) y del ítem. A diferencia de
 * los otros tres informes del módulo —que muestran saldos a hoy— este muestra
 * el **movimiento que los produjo**, uno por línea.
 *
 * **Supuestos pendientes de confirmar con backend**: los nombres de los campos
 * siguen el lookup de Django del ERP legacy (`documento__numero`,
 * `item__nombre`), porque su tabla pintaba las llaves crudas de la respuesta.
 * Si el API nuevo los devuelve aplanados (`documento_numero`), el fix es local:
 * este archivo y `historial-movimiento.constants.ts`.
 */
export interface HistorialMovimiento {
  readonly id: number;
  readonly documento__numero: number | string | null;
  readonly documento__documento_tipo__nombre: string | null;
  /** Fecha del documento (`yyyy-MM-dd`). */
  readonly documento__fecha: string | null;
  readonly documento__contacto__nombre_corto: string | null;
  readonly item__nombre: string | null;
  /**
   * Cantidad **con el signo del movimiento** aplicado: positiva en las entradas
   * y negativa en las salidas. Por eso el informe la muestra en vez de
   * `cantidad`, que siempre es positiva.
   */
  readonly cantidad_operada: number | string | null;
  /** Costo unitario de la línea. */
  readonly costo: number | string | null;
  /** Precio unitario de la línea. */
  readonly precio: number | string | null;
  /** Base de la línea (sin impuestos). */
  readonly subtotal: number | string | null;
}
