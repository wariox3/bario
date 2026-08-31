import type { ImpuestoLinea, TasaImpuesto } from '@reddoc/core';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';

/**
 * Fila del endpoint `general/impuesto/seleccionar/`. Además de `{ id, nombre }`
 * (lo que muestra el dropdown) trae la **tasa** del impuesto, fuente autoritativa
 * para calcular el monto de cualquier impuesto elegido en la línea —no solo los
 * configurados en el ítem.
 */
export interface ImpuestoSeleccionarOption {
  readonly id: number;
  readonly nombre: string;
  /** Porcentaje del impuesto, e.g. `"19.00"`. */
  readonly porcentaje?: string | null;
  /** Porcentaje de la base sobre la que aplica, e.g. `"100.00"`. */
  readonly porcentaje_base?: string | null;
  /** Operación sobre el total: `1` suma, `-1` resta (retención). */
  readonly operacion?: number | null;
}

/**
 * Valores crudos de una línea de detalle **comercial** (`form.getRawValue()` de
 * cada `FormGroup` del `FormArray`). Compartido por todos los documentos
 * comerciales (factura venta/compra, notas). El mapper los normaliza al payload.
 *
 * Cálculo por línea (front autoritativo, vía `@reddoc/core/calculo`):
 *   subtotal = cantidad × precio · descuento = subtotal × desc%/100
 *   base = subtotal − descuento · impuesto = base × tasas · neto = base + impuesto
 */
export interface ComercialDetalleFormRawValue {
  /** Id de la línea persistida (`null` mientras no exista en backend). */
  readonly id: number | null;
  readonly item: ItemOption | null;
  readonly cantidad: number | null;
  readonly precio: number | null;
  /** Porcentaje de descuento (0–100). */
  readonly descuento: number | null;
  readonly impuestos_ids: number[];
  /** Montos por impuesto, calculados en el front para el desglose del resumen. */
  readonly impuestos_totales: readonly ImpuestoLinea[];
  /**
   * Pool de tasas de venta del catálogo (cache interna para recalcular el monto
   * de cualquier impuesto seleccionado). El recompute lo intersecta con
   * `impuestos_ids`. No se renderiza ni viaja al backend.
   */
  readonly impuestos_disponibles: readonly TasaImpuesto[];
  /** Nota libre de la línea. */
  readonly detalle: string | null;
  /**
   * Id de la línea origen que esta línea **afecta** (descuenta su pendiente),
   * cuando proviene de "importar desde documento". `null` en líneas normales.
   * No se renderiza; viaja al backend en el payload para conservar el vínculo.
   */
  readonly documento_detalle_afectado: number | null;
}
