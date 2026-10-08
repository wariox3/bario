/**
 * Forma cruda del FormGroup de la lista de precios (lo que devuelve
 * `form.getRawValue()`). `fecha_vence` se maneja como `Date` (p-datepicker).
 *
 * `venta` / `compra` no están: no se capturan en pantalla, los fija
 * `formValueToPayload`.
 */
export interface PrecioFormRawValue {
  nombre: string | null;
  fecha_vence: Date | null;
}
