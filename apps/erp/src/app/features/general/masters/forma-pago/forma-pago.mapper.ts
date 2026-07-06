import type { ErpSelectOption } from '@reddoc/core';
import type { FormaPago, FormaPagoPayload } from './forma-pago.model';
import type { FormaPagoFormRawValue } from './pages/forma-pago-form/forma-pago-form.types';

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

export function formaPagoToFormValue(m: FormaPago): Partial<FormaPagoFormRawValue> {
  return { nombre: m.nombre, cuenta: cuentaOption(m.cuenta, m.cuenta_codigo, m.cuenta_nombre) };
}

export function formValueToPayload(v: FormaPagoFormRawValue): FormaPagoPayload {
  return { nombre: v.nombre ?? '', cuenta: v.cuenta?.id ?? null };
}
