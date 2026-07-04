import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { DocumentoSoporteRead, DocumentoSoportePayload } from './documento-soporte.model';
import type { DocumentoSoporteFormRawValue } from './documento-soporte-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function documentoSoporteToFormValue(
  read: DocumentoSoporteRead,
): Partial<Omit<DocumentoSoporteFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    fecha_vence: fromIsoDate(read.fecha_vence),
    plazo_pago:
      read.plazo_pago != null
        ? { id: read.plazo_pago, nombre: read.plazo_pago_nombre ?? '' }
        : null,
    sede: read.sede != null ? { id: read.sede, nombre: read.sede_nombre ?? '' } : null,
    metodo_pago:
      read.metodo_pago != null
        ? { id: read.metodo_pago, nombre: read.metodo_pago_nombre ?? '' }
        : null,
    forma_pago:
      read.forma_pago != null
        ? { id: read.forma_pago, nombre: read.forma_pago_nombre ?? '' }
        : null,
    resolucion:
      read.resolucion != null
        ? { id: read.resolucion, nombre: read.resolucion_nombre ?? '' }
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
  raw: DocumentoSoporteFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): DocumentoSoportePayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    fecha_vence: toIsoDate(raw.fecha_vence),
    plazo_pago: raw.plazo_pago?.id ?? null,
    sede: raw.sede?.id ?? null,
    metodo_pago: raw.metodo_pago?.id ?? null,
    forma_pago: raw.forma_pago?.id ?? null,
    resolucion: raw.resolucion?.id ?? null,
    orden_compra: raw.orden_compra?.trim() || null,
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
