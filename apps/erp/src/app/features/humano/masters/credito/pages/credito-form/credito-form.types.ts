import type { ErpSelectOption } from '@reddoc/core';
import type { ContratoOption } from '@reddoc/ui';

/**
 * Forma cruda del FormGroup del crédito (lo que devuelve `form.getRawValue()`).
 * `contrato` guarda un `ContratoOption` (autocomplete); `concepto` un
 * `ErpSelectOption` (autocomplete genérico). La fecha se maneja como `Date`
 * (p-datepicker) y los montos/contadores como `number` (p-inputNumber).
 */
export interface CreditoFormRawValue {
  contrato: ContratoOption | null;
  concepto: ErpSelectOption | null;
  fecha_inicio: Date | null;
  total: number | null;
  cuota: number | null;
  cantidad_cuotas: number | null;
  inactivo: boolean | null;
  aplica_prima: boolean | null;
  aplica_cesantia: boolean | null;
}
