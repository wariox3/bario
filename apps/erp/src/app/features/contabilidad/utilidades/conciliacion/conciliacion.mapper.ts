import { fromIsoDate, toIsoDate } from '@reddoc/core';
import type { Conciliacion, ConciliacionPayload } from './conciliacion.model';
import type { ConciliacionFormRawValue } from './conciliacion-form.types';

/** Read-model (GET) → valores del formulario (edición). */
export function conciliacionToFormValue(read: Conciliacion): Partial<ConciliacionFormRawValue> {
  return {
    fecha_desde: fromIsoDate(read.fecha_desde),
    fecha_hasta: fromIsoDate(read.fecha_hasta),
    cuenta_banco:
      read.cuenta_banco != null
        ? { id: read.cuenta_banco, nombre: read.cuenta_banco__nombre ?? '' }
        : null,
  };
}

/** Valores del formulario → payload de la API. */
export function formValueToPayload(raw: ConciliacionFormRawValue): ConciliacionPayload {
  return {
    fecha_desde: toIsoDate(raw.fecha_desde),
    fecha_hasta: toIsoDate(raw.fecha_hasta),
    cuenta_banco: raw.cuenta_banco?.id ?? null,
  };
}
