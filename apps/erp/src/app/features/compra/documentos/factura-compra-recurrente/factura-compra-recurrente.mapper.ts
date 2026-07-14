import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type {
  FacturaCompraRecurrenteRead,
  FacturaCompraRecurrentePayload,
} from './factura-compra-recurrente.model';
import type { FacturaCompraRecurrenteFormRawValue } from './factura-compra-recurrente-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function facturaCompraRecurrenteToFormValue(
  read: FacturaCompraRecurrenteRead,
): Partial<Omit<FacturaCompraRecurrenteFormRawValue, 'detalles'>> {
  return {
    contacto:
      read.contacto != null ? { id: read.contacto, nombre: read.contacto_nombre ?? '' } : null,
    fecha: fromIsoDate(read.fecha),
    plazo_pago:
      read.plazo_pago != null
        ? { id: read.plazo_pago, nombre: read.plazo_pago_nombre ?? '' }
        : null,
    forma_pago:
      read.forma_pago != null
        ? { id: read.forma_pago, nombre: read.forma_pago_nombre ?? '' }
        : null,
    centro_costo:
      read.centro_costo != null
        ? { id: read.centro_costo, nombre: read.centro_costo_nombre ?? '' }
        : null,
    sede: read.sede != null ? { id: read.sede, nombre: read.sede_nombre ?? '' } : null,
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
  raw: FacturaCompraRecurrenteFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): FacturaCompraRecurrentePayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    plazo_pago: raw.plazo_pago?.id ?? null,
    forma_pago: raw.forma_pago?.id ?? null,
    centro_costo: raw.centro_costo?.id ?? null,
    sede: raw.sede?.id ?? null,
    orden_compra: raw.orden_compra?.trim() || null,
    comentario: raw.comentario?.trim() || null,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
