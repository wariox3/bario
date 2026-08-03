import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';

/**
 * Fila de pago del formulario (`form.getRawValue()`).
 *
 * `cuenta_banco` guarda la opción completa (`{ id, nombre }`); `pago` es el monto
 * numérico del `<p-inputnumber>`. El mapper la normaliza a `{ cuenta_banco, pago }`.
 */
export interface PagoFormRawValue {
  readonly cuenta_banco: ErpSelectOption | null;
  readonly pago: number;
}

/** `FormGroup` tipado de una fila de pago (cuenta de banco + monto). */
export type PagoGroup = FormGroup<{
  cuenta_banco: FormControl<ErpSelectOption | null>;
  pago: FormControl<number>;
}>;

/** Crea una fila de pago (cuenta de banco requerida, monto ≥ 0). */
export function createPagoGroup(value?: Partial<PagoFormRawValue>): PagoGroup {
  return new FormGroup({
    cuenta_banco: new FormControl<ErpSelectOption | null>(value?.cuenta_banco ?? null, {
      validators: Validators.required,
    }),
    pago: new FormControl<number>(value?.pago ?? 0, {
      nonNullable: true,
      validators: Validators.min(0),
    }),
  });
}
