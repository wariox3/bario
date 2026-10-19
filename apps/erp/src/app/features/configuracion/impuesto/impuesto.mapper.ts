import type { ErpSelectOption } from '@reddoc/core';
import type { Impuesto, ImpuestoPayload, ImpuestoRow } from './impuesto.model';

/** `código - nombre`, o vacío si no hay cuenta asignada. */
function cuentaLabel(codigo: string | null, nombre: string | null): string {
  return [codigo, nombre].filter(Boolean).join(' - ');
}

/** Fila del backend → fila de la tabla, con la cuenta aplanada a una etiqueta. */
export function toImpuestoRow(impuesto: Impuesto): ImpuestoRow {
  return {
    ...impuesto,
    cuenta_label: cuentaLabel(impuesto.cuenta_codigo, impuesto.cuenta_nombre),
  };
}

export interface ImpuestoFormValue {
  readonly cuenta: ErpSelectOption | null;
}

/**
 * Siembra la cuenta guardada con la etiqueta `código - nombre`, la misma que
 * arma `app-cuenta-select`: el autocomplete abre con el valor puesto sin ir al
 * servidor a resolverlo.
 */
export function impuestoToForm(impuesto: Impuesto): ImpuestoFormValue {
  if (impuesto.cuenta == null) return { cuenta: null };
  return {
    cuenta: {
      id: impuesto.cuenta,
      nombre: cuentaLabel(impuesto.cuenta_codigo, impuesto.cuenta_nombre),
      codigo: impuesto.cuenta_codigo ?? '',
    },
  };
}

/**
 * Vaciar la cuenta manda `null`, que es como el backend la quita: omitir la
 * clave en un PATCH la dejaría como estaba.
 */
export function impuestoFormToPayload(form: ImpuestoFormValue): ImpuestoPayload {
  return { cuenta: form.cuenta?.id ?? null };
}
