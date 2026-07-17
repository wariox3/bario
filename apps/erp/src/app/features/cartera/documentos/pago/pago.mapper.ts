import { fromIsoDate, toIsoDate } from '@reddoc/core';
import {
  calcularResumenContable,
  cuentaDetalleToPayload,
} from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import type { PagoRead, PagoPayload } from './pago.model';
import type { PagoFormRawValue } from './pago-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function pagoToFormValue(read: PagoRead): Partial<Omit<PagoFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    cuenta_banco:
      read.cuenta_banco != null
        ? { id: read.cuenta_banco, nombre: read.cuenta_banco_nombre ?? '' }
        : null,
    comentario: read.comentario,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`. El
 * `total` es el neto de las líneas (`créditos − débitos`), la misma cuenta que ve
 * el usuario en el resumen: se deriva acá y no se teclea.
 *
 * En **edición** se omiten los detalles (`includeDetalles=false`): transaccionan
 * en vivo contra `documento-detalle`. En **alta** viajan embebidos.
 */
export function formValueToPayload(
  raw: PagoFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): PagoPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    cuenta_banco: raw.cuenta_banco?.id ?? null,
    comentario: raw.comentario,
    total: calcularResumenContable(raw.detalles).total.toFixed(2),
    ...(includeDetalles ? { detalles: raw.detalles.map(cuentaDetalleToPayload) } : {}),
  };
}
