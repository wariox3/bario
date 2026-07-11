import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';
import type {
  CuentaDetalleFormRawValue,
  NaturalezaCuenta,
} from './contable-documento-detalle.types';

/** `FormGroup` tipado de una línea de cuenta contable. */
export type CuentaDetalleGroup = FormGroup<{
  id: FormControl<number | null>;
  cuenta: FormControl<ErpSelectOption | null>;
  naturaleza: FormControl<NaturalezaCuenta>;
  valor: FormControl<number | null>;
}>;

/**
 * Crea un `FormGroup` de línea de cuenta (vacío o precargado en edición).
 *
 * Sin suscripciones internas: una línea de cuenta no recalcula impuestos ni
 * deriva campos —su valor lo teclea el usuario directo—, así que el grupo es puro
 * estado de formulario. El acumulado de débitos/créditos se deriva fuera, en la
 * tabla, a partir del valor del array.
 */
export function createCuentaDetalleGroup(
  value?: Partial<CuentaDetalleFormRawValue>,
): CuentaDetalleGroup {
  return new FormGroup({
    id: new FormControl<number | null>(value?.id ?? null),
    cuenta: new FormControl<ErpSelectOption | null>(value?.cuenta ?? null, {
      validators: Validators.required,
    }),
    naturaleza: new FormControl<NaturalezaCuenta>(value?.naturaleza ?? 'D', {
      nonNullable: true,
    }),
    valor: new FormControl<number | null>(value?.valor ?? null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
  });
}
