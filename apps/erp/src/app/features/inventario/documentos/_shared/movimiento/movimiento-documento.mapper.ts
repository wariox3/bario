import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { inventarioDetalleToPayload } from '@erp/features/documentos/inventario/inventario-documento-detalle.mapper';
import type { MovimientoRead, MovimientoPayload } from './movimiento-documento.model';
import type { MovimientoFormRawValue } from './movimiento-documento-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function movimientoToFormValue(
  read: MovimientoRead,
): Partial<Omit<MovimientoFormRawValue, 'detalles'>> {
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
  raw: MovimientoFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): MovimientoPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    almacen: raw.almacen?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles ? { detalles: raw.detalles.map(inventarioDetalleToPayload) } : {}),
  };
}
