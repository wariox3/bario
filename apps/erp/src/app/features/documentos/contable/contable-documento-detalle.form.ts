import {
  type AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
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
  numero: FormControl<number | null>;
  detalle: FormControl<string | null>;
  documento_afectado: FormControl<number | null>;
  documento_afectado_numero: FormControl<string | null>;
  documento_afectado_tipo: FormControl<string | null>;
}>;

/**
 * La cuenta de la línea exige base (`exige_base` del `seleccionar/`) y la base
 * está en cero. Vive en el control `base` —no en el grupo— para que
 * `libFocusInvalid` lleve a la persona a ese campo; por eso lee la cuenta del
 * padre y el grupo lo re-evalúa cada vez que la cuenta cambia.
 *
 * Una cuenta cargada desde el backend (edición, cruce) no trae la bandera: no se
 * valida hasta que se vuelva a elegir en el selector.
 */
function baseExigidaValidator(control: AbstractControl<number | null>): ValidationErrors | null {
  const cuenta = control.parent?.get('cuenta')?.value as ErpSelectOption | null | undefined;
  if (cuenta?.['exige_base'] !== true) return null;
  return (control.value ?? 0) > 0 ? null : { baseExigida: true };
}

/**
 * Crea un `FormGroup` de línea de cuenta (vacío o precargado en edición).
 *
 * Una línea de cuenta no recalcula impuestos ni deriva campos —su valor lo
 * teclea el usuario directo—. La única suscripción interna re-evalúa la base
 * cuando cambia la cuenta, porque su obligatoriedad depende de ella
 * (`baseExigidaValidator`). El acumulado de débitos/créditos se deriva fuera, en
 * la tabla, a partir del valor del array.
 *
 * `contacto`, `centro_costo`, `base`, `numero` y `detalle` existen siempre en el
 * grupo aunque la tabla los oculte: así el shape de la línea es uno solo y el
 * mapper no necesita ramas. Un documento que no los usa los deja en su default nulo.
 * Ninguno es obligatorio —solo `cuenta` y `valor` lo son—, salvo la `base` cuando
 * la cuenta elegida la exige.
 *
 * Una línea **enlazada** (`documento_afectado != null`) nace con `cuenta`,
 * `naturaleza` y `contacto` deshabilitados: su imputación y su tercero los fija el
 * cruce, no el usuario.
 * El componente lee todo con `getRawValue()`, así que los disabled no se pierden.
 * Si el cruce llega **sin cuenta** (hueco del contrato), `cuenta` queda
 * habilitada: un disabled en null pasaría la validación en silencio; así el
 * `required` la marca y el usuario puede imputarla a mano.
 */
export function createCuentaDetalleGroup(
  value?: Partial<CuentaDetalleFormRawValue>,
): CuentaDetalleGroup {
  const enlazada = value?.documento_afectado != null;
  const group: CuentaDetalleGroup = new FormGroup({
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
    contacto: new FormControl<ErpSelectOption | null>({
      value: value?.contacto ?? null,
      disabled: enlazada,
    }),
    centro_costo: new FormControl<ErpSelectOption | null>(value?.centro_costo ?? null),
    base: new FormControl<number | null>(value?.base ?? 0, baseExigidaValidator),
    numero: new FormControl<number | null>(value?.numero ?? null),
    detalle: new FormControl<string | null>(value?.detalle ?? null, Validators.maxLength(200)),
    documento_afectado: new FormControl<number | null>(value?.documento_afectado ?? null),
    documento_afectado_numero: new FormControl<string | null>(
      value?.documento_afectado_numero ?? null,
    ),
    documento_afectado_tipo: new FormControl<string | null>(value?.documento_afectado_tipo ?? null),
  });
  // El control y su suscriptor mueren con el grupo: no hace falta desuscribir.
  group.controls.cuenta.valueChanges.subscribe(() => group.controls.base.updateValueAndValidity());
  group.controls.base.updateValueAndValidity();
  return group;
}

/**
 * Replica el contacto de la cabecera en las líneas manuales que aún no se guardaron.
 *
 * Una línea libre nace con el tercero del documento, pero solo mientras sea
 * suya: las ya persistidas conservan el que tengan (cambiarlas es decisión
 * explícita del usuario, fila por fila) y las enlazadas a un documento conservan
 * el del documento que cruzan.
 */
export function propagarContactoALineas(
  detalles: FormArray<CuentaDetalleGroup>,
  contacto: ErpSelectOption | null,
): void {
  propagarALineasLibres(detalles, 'contacto', contacto);
}

/**
 * Replica el centro de costo de la cabecera en las líneas manuales que aún no se
 * guardaron. Misma regla que el contacto: las persistidas y las enlazadas a un
 * documento conservan el suyo.
 */
export function propagarCentroCostoALineas(
  detalles: FormArray<CuentaDetalleGroup>,
  centroCosto: ErpSelectOption | null,
): void {
  propagarALineasLibres(detalles, 'centro_costo', centroCosto);
}

function propagarALineasLibres(
  detalles: FormArray<CuentaDetalleGroup>,
  campo: 'contacto' | 'centro_costo',
  valor: ErpSelectOption | null,
): void {
  for (const group of detalles.controls) {
    if (group.controls.id.value !== null) continue;
    if (group.controls.documento_afectado.value !== null) continue;
    group.controls[campo].setValue(valor);
  }
}
