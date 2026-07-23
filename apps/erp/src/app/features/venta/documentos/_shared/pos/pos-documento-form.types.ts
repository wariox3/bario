import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import type { PagoFormRawValue } from '@erp/features/documentos/pagos/pago.form';

/**
 * Valores crudos del formulario de un documento POS (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` y
 * `fecha_vence` son `Date` del datepicker; `detalles` son las líneas comerciales
 * y `pagos` los cobros del punto de venta. El mapper los normaliza al payload.
 */
export interface PosDocumentoFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly fecha_vence: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  readonly asesor: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
  readonly pagos: readonly PagoFormRawValue[];
}
