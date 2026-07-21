/**
 * Fila del informe **Ventas por ítem**
 * (`POST /general/documento-detalle-informe/lista/`, `informe: 'venta_item'`).
 *
 * Es una línea de `documento-detalle` de documentos de venta, aplanada con
 * datos del documento padre (tipo, número, fecha, contacto) y del ítem.
 * Convención del backend: los ids viajan como `number`; los montos como
 * `string` con cola de decimales (`"17114747.958000"`).
 *
 * **Supuesto pendiente de confirmar con backend**: el identificador
 * `venta_item` y los nombres aplanados siguen la convención de
 * `pendiente_facturar`; el informe equivalente del proyecto viejo consultaba
 * `general/documento_detalle/` con `serializador=informe_venta`.
 */
export interface VentaItem {
  readonly id: number;
  /** FK e identificación visible del documento padre. */
  readonly documento_id: number;
  readonly documento_numero: number | string | null;
  /** Fecha del documento (`yyyy-MM-dd`). */
  readonly documento_fecha: string | null;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo_nombre: string | null;
  readonly contacto_id: number | null;
  readonly contacto_numero_identificacion: string | null;
  readonly contacto_nombre: string | null;
  readonly item_id: number | null;
  readonly item_nombre: string | null;
  /** Cantidad de la línea (string decimal, p. ej. `"1.000000"`). */
  readonly cantidad: string | null;
  /** Precio unitario de la línea. */
  readonly precio: string | null;
  /** Base de la línea (precio × cantidad, sin impuestos). */
  readonly subtotal: string | null;
  /** Impuestos de la línea. */
  readonly impuesto: string | null;
  /** Total de la línea (subtotal + impuesto). */
  readonly total: string | null;
}
