import type { PagoFormRawValue } from './pago.form';
import type { PagoPayload, PagoRead } from './pago.model';

/** Read-model de un pago → fila del formulario (para poblar el `FormArray` en edición). */
export function pagoReadToFormValue(read: PagoRead): PagoFormRawValue {
  return {
    cuenta_banco:
      read.cuenta_banco != null
        ? { id: read.cuenta_banco, nombre: read.cuenta_banco_nombre ?? '' }
        : null,
    pago: Number(read.pago ?? 0),
  };
}

/**
 * Filas de pago del formulario → fragmento del payload del documento.
 *
 * Descarta las filas sin cuenta de banco y normaliza los montos a string con 2
 * decimales. `pago` es el total recibido (suma de `pagos[].pago`), como lo
 * espera el backend (asunción de contrato calcada del legacy).
 */
export function pagosToPayload(rawPagos: readonly PagoFormRawValue[]): {
  readonly pago: string;
  readonly pagos: readonly PagoPayload[];
} {
  const pagos = rawPagos
    .filter((p) => p.cuenta_banco?.id != null)
    .map((p) => ({ cuenta_banco: p.cuenta_banco?.id ?? null, pago: (p.pago ?? 0).toFixed(2) }));
  const totalPagos = rawPagos.reduce((acc, p) => acc + (p.pago ?? 0), 0);
  return { pago: totalPagos.toFixed(2), pagos };
}
