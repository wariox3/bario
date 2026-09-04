import type { ErpSelectOption, ImpuestoLinea, TasaImpuesto } from '@reddoc/core';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';

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
   * Almacén de la línea. Solo lo piden los documentos que declaran la columna
   * (`almacenEnabled`); en el resto queda en `null` y no se renderiza.
   */
  readonly almacen: ErpSelectOption | null;
  /**
   * Id de la línea origen que esta línea **afecta** (descuenta su pendiente),
   * cuando proviene de "importar desde documento". `null` en líneas normales.
   * No se renderiza; viaja al backend en el payload para conservar el vínculo.
   */
  readonly documento_detalle_afectado: number | null;
}
