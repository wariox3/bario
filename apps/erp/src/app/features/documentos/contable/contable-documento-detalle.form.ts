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
  documento_afectado: FormControl<number | null>;
  documento_afectado_numero: FormControl<string | null>;
  documento_afectado_tipo: FormControl<string | null>;
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
 *
 * Una línea **enlazada** (`documento_afectado != null`) nace con `cuenta` y
 * `naturaleza` deshabilitadas: su imputación la fija el cruce, no el usuario.
 * El componente lee todo con `getRawValue()`, así que los disabled no se pierden.
 * Si el cruce llega **sin cuenta** (hueco del contrato), `cuenta` queda
 * habilitada: un disabled en null pasaría la validación en silencio; así el
 * `required` la marca y el usuario puede imputarla a mano.
 */
export function createCuentaDetalleGroup(
  value?: Partial<CuentaDetalleFormRawValue>,
): CuentaDetalleGroup {
  const enlazada = value?.documento_afectado != null;
  return new FormGroup({
    id: new FormControl<number | null>(value?.id ?? null),
    cuenta: new FormControl<ErpSelectOption | null>(
      { value: value?.cuenta ?? null, disabled: enlazada && value?.cuenta != null },
      { validators: Validators.required },
    ),
    naturaleza: new FormControl<NaturalezaCuenta>(
      { value: value?.naturaleza ?? 'D', disabled: enlazada },
      { nonNullable: true },
    ),
    valor: new FormControl<number | null>(value?.valor ?? null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    contacto: new FormControl<ErpSelectOption | null>(value?.contacto ?? null),
    centro_costo: new FormControl<ErpSelectOption | null>(value?.centro_costo ?? null),
    base: new FormControl<number | null>(value?.base ?? 0),
    documento_afectado: new FormControl<number | null>(value?.documento_afectado ?? null),
    documento_afectado_numero: new FormControl<string | null>(
      value?.documento_afectado_numero ?? null,
    ),
    documento_afectado_tipo: new FormControl<string | null>(value?.documento_afectado_tipo ?? null),
  });
}
