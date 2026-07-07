import type { ErpSelectOption } from '@reddoc/core';
import type { ContratoOption } from '@reddoc/ui';

/**
 * Forma cruda del FormGroup del adicional (lo que devuelve `form.getRawValue()`).
 * `contrato` guarda un `ContratoOption` (autocomplete); `concepto` un
 * `ErpSelectOption` (autocomplete genérico). `valor` es `number` (p-inputNumber)
 * y `detalle` texto libre.
 */
export interface AdicionalFormRawValue {
  contrato: ContratoOption | null;
  concepto: ErpSelectOption | null;
  valor: number | null;
  detalle: string | null;
  aplica_dia_laborado: boolean | null;
  inactivo: boolean | null;
}
