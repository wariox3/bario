import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import type { PagoFormRawValue } from '@erp/features/documentos/pagos/pago.form';

/**
 * Valores crudos del formulario de una nota de venta (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `documento_referencia`
 * es la opción de la factura ajustada; `fecha` es `Date` del datepicker;
 * `detalles` son las líneas comerciales y `pagos` los cobros. El mapper los
 * normaliza al payload de la API.
 */
export interface NotaVentaFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly documento_referencia: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
  readonly pagos: readonly PagoFormRawValue[];
}
