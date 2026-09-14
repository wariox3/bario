import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';

/**
 * Fila de pago del formulario (`form.getRawValue()`).
 *
 * `id` es `null` mientras el pago no existe en el backend; `cuenta_banco` guarda la
 * opción completa (`{ id, nombre }`); `pago` es el monto numérico del
 * `<p-inputnumber>`. Un pago anulado viene del backend y es de solo lectura.
 */
export interface PagoFormRawValue {
  readonly id: number | null;
  readonly cuenta_banco: ErpSelectOption | null;
  readonly pago: number;
  readonly estado_anulado: boolean;
}

/** `FormGroup` tipado de una fila de pago. */
export type PagoGroup = FormGroup<{
  id: FormControl<number | null>;
  cuenta_banco: FormControl<ErpSelectOption | null>;
  pago: FormControl<number>;
  estado_anulado: FormControl<boolean>;
}>;

/**
 * Crea una fila de pago (cuenta de banco requerida, monto > 0: un pago en cero no
 * es un pago). Un pago anulado nace **deshabilitado**: no se edita, no invalida el
 * formulario y `getRawValue()` lo sigue trayendo para pintarlo.
 */
export function createPagoGroup(value?: Partial<PagoFormRawValue>): PagoGroup {
  const group: PagoGroup = new FormGroup({
    id: new FormControl<number | null>(value?.id ?? null),
    cuenta_banco: new FormControl<ErpSelectOption | null>(value?.cuenta_banco ?? null, {
      validators: Validators.required,
    }),
    pago: new FormControl<number>(value?.pago ?? 0, {
      nonNullable: true,
      validators: Validators.min(1),
    }),
    estado_anulado: new FormControl<boolean>(value?.estado_anulado ?? false, {
      nonNullable: true,
    }),
  });
  if (value?.estado_anulado) group.disable({ emitEvent: false });
  return group;
}
