import type { ErpSelectOption } from '@reddoc/core';
import type { CuentaBanco, CuentaBancoPayload } from './cuenta-banco.model';
import type { CuentaBancoFormRawValue } from './pages/cuenta-banco-form/cuenta-banco-form.types';
import { CUENTA_BANCO_TIPO_CAJA } from './cuenta-banco.constants';

/** Reagrupa el id de la cuenta contable + su `*_codigo`/`*_nombre` en un `ErpSelectOption`. */
function cuentaOption(
  id: number | null,
  codigo?: string | null,
  nombre?: string | null,
): ErpSelectOption | null {
  if (id == null) return null;
  const label = [codigo, nombre].filter(Boolean).join(' - ');
  return { id, nombre: label || (nombre ?? '') };
}

/**
 * Adapta el read-model (`CuentaBanco`) a los valores del reactive form.
 *
 * Los FK de tipo/clase usan `lib-api-select`: el `nombre` puede ir vacío porque
 * el select resuelve la etiqueta contra sus opciones por `id`. La cuenta contable
 * usa `app-cuenta-select`, cuya etiqueta es `código - nombre`.
 */
export function cuentaBancoToFormValue(c: CuentaBanco): Partial<CuentaBancoFormRawValue> {
  return {
    nombre: c.nombre,
    numero_cuenta: c.numero_cuenta ?? '',
    cuenta_banco_tipo: { id: c.cuenta_banco_tipo, nombre: c.cuenta_banco_tipo_nombre ?? '' },
    cuenta_banco_clase:
      c.cuenta_banco_clase != null
        ? { id: c.cuenta_banco_clase, nombre: c.cuenta_banco_clase_nombre ?? '' }
        : null,
    cuenta: cuentaOption(c.cuenta, c.cuenta_codigo, c.cuenta_nombre),
  };
}

/**
 * Construye el write-model (`CuentaBancoPayload`) a partir del valor crudo del form.
 *
 * Regla de negocio (heredada del legacy): cuando el tipo es "caja"
 * ({@link CUENTA_BANCO_TIPO_CAJA}), el backend no espera número de cuenta ni
 * clase, así que se fuerzan a `null` sin importar lo que tenga el form.
 */
export function formValueToPayload(v: CuentaBancoFormRawValue): CuentaBancoPayload {
  const esCaja = v.cuenta_banco_tipo?.id === CUENTA_BANCO_TIPO_CAJA;

  return {
    nombre: v.nombre ?? '',
    numero_cuenta: esCaja ? null : v.numero_cuenta || null,
    cuenta_banco_tipo: v.cuenta_banco_tipo?.id ?? null,
    cuenta_banco_clase: esCaja ? null : (v.cuenta_banco_clase?.id ?? null),
    cuenta: v.cuenta?.id ?? null,
  };
}
