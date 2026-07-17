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
  contacto: FormControl<ErpSelectOption | null>;
  centro_costo: FormControl<ErpSelectOption | null>;
  base: FormControl<number | null>;
}>;

/**
 * Crea un `FormGroup` de línea de cuenta (vacío o precargado en edición).
 *
 * Sin suscripciones internas: una línea de cuenta no recalcula impuestos ni
 * deriva campos —su valor lo teclea el usuario directo—, así que el grupo es puro
 * estado de formulario. El acumulado de débitos/créditos se deriva fuera, en la
 * tabla, a partir del valor del array.
 *
 * `contacto`, `centro_costo` y `base` existen siempre en el grupo aunque la tabla los
 * oculte: así el shape de la línea es uno solo y el mapper no necesita ramas. Un
 * documento que no los usa los deja en su default nulo.
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
    contacto: new FormControl<ErpSelectOption | null>(value?.contacto ?? null),
    centro_costo: new FormControl<ErpSelectOption | null>(value?.centro_costo ?? null),
    base: new FormControl<number | null>(value?.base ?? 0),
  });
}
