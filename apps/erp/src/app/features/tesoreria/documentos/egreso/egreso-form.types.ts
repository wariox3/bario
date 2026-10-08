import type { ErpSelectOption } from '@reddoc/core';
import type { CuentaDetalleFormRawValue } from '@erp/features/documentos/contable/contable-documento-detalle.types';

/**
 * Valores crudos del formulario de Egreso (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es un `Date`
 * del datepicker; `detalles` son las líneas contables del desembolso. El mapper
 * los normaliza al payload de la API.
 */
export interface EgresoFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly cuenta_banco: ErpSelectOption | null;
  readonly comentario: string | null;
  readonly detalles: readonly CuentaDetalleFormRawValue[];
}
