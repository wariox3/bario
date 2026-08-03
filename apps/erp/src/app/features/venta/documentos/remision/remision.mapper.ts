import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { RemisionRead, RemisionPayload } from './remision.model';
import type { RemisionFormRawValue } from './remision-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function remisionToFormValue(
  read: RemisionRead,
): Partial<Omit<RemisionFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    sede: read.sede != null ? { id: read.sede, nombre: read.sede_nombre ?? '' } : null,
    asesor: read.asesor != null ? { id: read.asesor, nombre: read.asesor_nombre ?? '' } : null,
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
  raw: RemisionFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): RemisionPayload {
  const comentario = raw.comentario?.trim();
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    sede: raw.sede?.id ?? null,
    asesor: raw.asesor?.id ?? null,
    comentario: comentario ? comentario : null,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
