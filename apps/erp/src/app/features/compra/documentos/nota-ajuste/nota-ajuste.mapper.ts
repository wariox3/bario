import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { NotaAjusteRead, NotaAjustePayload } from './nota-ajuste.model';
import type { NotaAjusteFormRawValue } from './nota-ajuste-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function notaAjusteToFormValue(
  read: NotaAjusteRead,
): Partial<Omit<NotaAjusteFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    fecha_vence: fromIsoDate(read.fecha_vence),
    plazo_pago:
      read.plazo_pago != null
        ? { id: read.plazo_pago, nombre: read.plazo_pago_nombre ?? '' }
        : null,
    metodo_pago:
      read.metodo_pago != null
        ? { id: read.metodo_pago, nombre: read.metodo_pago_nombre ?? '' }
        : null,
    centro_costo:
      read.centro_costo != null
        ? { id: read.centro_costo, nombre: read.centro_costo_nombre ?? '' }
        : null,
    orden_compra: read.orden_compra ?? null,
    comentario: read.comentario ?? null,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`.
 * En **edición** se omiten los detalles (`includeDetalles=false`): transaccionan
 * en vivo contra `documento-detalle`. En **alta** viajan embebidos.
 */
export function formValueToPayload(
  raw: NotaAjusteFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): NotaAjustePayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    fecha_vence: toIsoDate(raw.fecha_vence),
    plazo_pago: raw.plazo_pago?.id ?? null,
    metodo_pago: raw.metodo_pago?.id ?? null,
    centro_costo: raw.centro_costo?.id ?? null,
    orden_compra: raw.orden_compra?.trim() || null,
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
