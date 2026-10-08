import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Factura de compra recurrente
 * (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es `Date`
 * del datepicker; `orden_compra` es texto; `detalles` son las líneas
 * comerciales. El mapper los normaliza al payload de la API.
 */
export interface FacturaCompraRecurrenteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly forma_pago: ErpSelectOption | null;
  readonly centro_costo: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
