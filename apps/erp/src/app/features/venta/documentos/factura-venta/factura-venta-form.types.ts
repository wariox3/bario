import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Factura de venta (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` y
 * `fecha_vence` son `Date` del datepicker; `detalles` son las líneas comerciales.
 * El mapper los normaliza al payload de la API.
 */
export interface FacturaVentaFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly fecha_vence: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
