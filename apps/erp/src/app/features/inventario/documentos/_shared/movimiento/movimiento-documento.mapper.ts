import { documentoContactoToOption, fromIsoDate, toIsoDate } from '@reddoc/core';
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
    contacto: documentoContactoToOption(read),
    almacen: read.almacen != null ? { id: read.almacen, nombre: read.almacen_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    comentario: read.comentario ?? null,
  };
}

/** Opciones de armado del payload; dependen del modo y del documento activo. */
interface PayloadOptions {
  /**
   * Incluir las líneas embebidas. `true` en **alta**; en **edición** se omiten
   * porque transaccionan en vivo contra `documento-detalle`.
   */
  readonly includeDetalles?: boolean;
  /**
   * Enviar `operacion_inventario` en cada línea. Solo lo prende el traslado
   * (ver `usaOperacionInventario`).
   */
  readonly incluirOperacion?: boolean;
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`.
 */
export function formValueToPayload(
  raw: MovimientoFormRawValue,
  documentTypeId: number,
  { includeDetalles = true, incluirOperacion = false }: PayloadOptions = {},
): MovimientoPayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    almacen: raw.almacen?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles
      ? { detalles: raw.detalles.map((line) => inventarioDetalleToPayload(line, incluirOperacion)) }
      : {}),
  };
}
