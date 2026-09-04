import { documentoContactoToOption, fromIsoDate, toIsoDate } from '@reddoc/core';
import {
  calcularResumenContable,
  cuentaDetalleToPayload,
} from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import type { AsientoRead, AsientoPayload } from './asiento.model';
import type { AsientoFormRawValue } from './asiento-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function asientoToFormValue(
  read: AsientoRead,
): Partial<Omit<AsientoFormRawValue, 'detalles'>> {
  return {
    contacto: documentoContactoToOption(read),
    fecha: fromIsoDate(read.fecha),
    soporte: read.soporte,
    comprobante:
      read.comprobante != null
        ? { id: read.comprobante, nombre: read.comprobante_nombre ?? '' }
        : null,
    centro_costo:
      read.centro_costo != null
        ? { id: read.centro_costo, nombre: read.centro_costo_nombre ?? '' }
        : null,
    comentario: read.comentario,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`. El
 * `total` es el neto de las líneas (`créditos − débitos`), que en un asiento
 * cuadrado da cero: se deriva acá y no se teclea, igual que en el legacy.
 *
 * En **edición** se omiten los detalles (`includeDetalles=false`): transaccionan
 * en vivo contra `documento-detalle`. En **alta** viajan embebidos.
 */
export function formValueToPayload(
  raw: AsientoFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): AsientoPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    soporte: raw.soporte,
    comprobante: raw.comprobante?.id ?? null,
    centro_costo: raw.centro_costo?.id ?? null,
    comentario: raw.comentario,
    total: calcularResumenContable(raw.detalles).total.toFixed(2),
    ...(includeDetalles ? { detalles: raw.detalles.map(cuentaDetalleToPayload) } : {}),
  };
}
