import type { ErpSelectOption } from '@reddoc/core';
import type { CuentaDetalleFormRawValue } from '@erp/features/documentos/contable/contable-documento-detalle.types';

/**
 * Valores crudos del formulario de Pago (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es un `Date`
 * del datepicker; `detalles` son las líneas contables del recaudo. El mapper los
 * normaliza al payload de la API.
 */
export interface PagoFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly cuenta_banco: ErpSelectOption | null;
  readonly comentario: string | null;
  readonly detalles: readonly CuentaDetalleFormRawValue[];
}
