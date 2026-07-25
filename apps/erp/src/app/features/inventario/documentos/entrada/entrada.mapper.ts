import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { inventarioDetalleToPayload } from '@erp/features/documentos/inventario/inventario-documento-detalle.mapper';
import type { EntradaRead, EntradaPayload } from './entrada.model';
import type { EntradaFormRawValue } from './entrada-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function entradaToFormValue(
  read: EntradaRead,
): Partial<Omit<EntradaFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    almacen: read.almacen != null ? { id: read.almacen, nombre: read.almacen_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
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
  raw: EntradaFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): EntradaPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    almacen: raw.almacen?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles ? { detalles: raw.detalles.map(inventarioDetalleToPayload) } : {}),
  };
}
