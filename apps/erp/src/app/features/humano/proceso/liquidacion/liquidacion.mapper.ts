import { fromIsoDate, toIsoDate } from '@reddoc/core';
import type { Liquidacion, LiquidacionPatch } from './liquidacion.model';

/** Valores crudos del formulario de edición de la cabecera. */
export interface LiquidacionFormRawValue {
  readonly fecha_ultimo_pago: Date | null;
  readonly fecha_ultimo_pago_cesantia: Date | null;
  readonly fecha_ultimo_pago_prima: Date | null;
  readonly fecha_ultimo_pago_vacacion: Date | null;
  readonly comentario: string | null;
}

/** Read-model (GET) → valores del formulario. */
export function liquidacionToFormValue(read: Liquidacion): LiquidacionFormRawValue {
  return {
    fecha_ultimo_pago: fromIsoDate(read.fecha_ultimo_pago),
    fecha_ultimo_pago_cesantia: fromIsoDate(read.fecha_ultimo_pago_cesantia),
    fecha_ultimo_pago_prima: fromIsoDate(read.fecha_ultimo_pago_prima),
    fecha_ultimo_pago_vacacion: fromIsoDate(read.fecha_ultimo_pago_vacacion),
    comentario: read.comentario,
  };
}

/** Valores del formulario → cuerpo del `PATCH`. Un comentario en blanco va como `null`. */
export function formValueToPatch(raw: LiquidacionFormRawValue): LiquidacionPatch {
  return {
    fecha_ultimo_pago: toIsoDate(raw.fecha_ultimo_pago),
    fecha_ultimo_pago_cesantia: toIsoDate(raw.fecha_ultimo_pago_cesantia),
    fecha_ultimo_pago_prima: toIsoDate(raw.fecha_ultimo_pago_prima),
    fecha_ultimo_pago_vacacion: toIsoDate(raw.fecha_ultimo_pago_vacacion),
    comentario: raw.comentario?.trim() || null,
  };
}
