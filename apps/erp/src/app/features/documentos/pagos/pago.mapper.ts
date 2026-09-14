import type { PagoFormRawValue } from './pago.form';
import type { PagoPayload, PagoRead } from './pago.model';

/** Read-model de un pago → fila del formulario (edición) o de la ficha. */
export function pagoReadToFormValue(read: PagoRead): PagoFormRawValue {
  return {
    id: read.id,
    cuenta_banco: { id: read.cuenta_banco, nombre: read.cuenta_banco_nombre ?? '' },
    pago: Number(read.pago ?? 0),
    estado_anulado: read.estado_anulado,
  };
}

/** Fila del formulario → body de `POST`/`PATCH /general/documento-pago/`. */
export function pagoToPayload(raw: PagoFormRawValue, documentoId: number): PagoPayload {
  return {
    documento: documentoId,
    cuenta_banco: raw.cuenta_banco?.id ?? null,
    pago: (raw.pago ?? 0).toFixed(2),
  };
}
