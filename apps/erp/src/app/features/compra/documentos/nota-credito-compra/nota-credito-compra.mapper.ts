import { documentoContactoToOption, fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { NotaCreditoCompraRead, NotaCreditoCompraPayload } from './nota-credito-compra.model';
import type { NotaCreditoCompraFormRawValue } from './nota-credito-compra-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function notaCreditoCompraToFormValue(
  read: NotaCreditoCompraRead,
): Partial<Omit<NotaCreditoCompraFormRawValue, 'detalles'>> {
  return {
    contacto: documentoContactoToOption(read),
    fecha: fromIsoDate(read.fecha),
    documento_referencia:
      read.documento_referencia != null
        ? { id: read.documento_referencia, nombre: read.documento_referencia_numero ?? '' }
        : null,
    centro_costo:
      read.centro_costo != null
        ? { id: read.centro_costo, nombre: read.centro_costo_nombre ?? '' }
        : null,
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
  raw: NotaCreditoCompraFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): NotaCreditoCompraPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    documento_referencia: raw.documento_referencia?.id ?? null,
    centro_costo: raw.centro_costo?.id ?? null,
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
