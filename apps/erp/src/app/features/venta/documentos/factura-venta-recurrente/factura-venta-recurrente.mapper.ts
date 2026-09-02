import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type {
  FacturaVentaRecurrenteRead,
  FacturaVentaRecurrentePayload,
} from './factura-venta-recurrente.model';
import type { FacturaVentaRecurrenteFormRawValue } from './factura-venta-recurrente-form.types';

/**
 * Read-model (GET) → valores de cabecera del formulario (edición).
 * No incluye `detalles` (se poblan aparte en el `FormArray`).
 */
export function facturaVentaRecurrenteToFormValue(
  read: FacturaVentaRecurrenteRead,
): Partial<Omit<FacturaVentaRecurrenteFormRawValue, 'detalles'>> {
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
    orden_compra: read.orden_compra ?? null,
    remision: read.remision ?? null,
    comentario: read.comentario ?? null,
    // El read no trae `asesor_nombre_corto`: se siembra la FK sin etiqueta y el
    // select la resuelve contra su catálogo (casa por `dataKey`).
    asesor: read.asesor != null ? { id: read.asesor, nombre: '' } : null,
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
  raw: FacturaVentaRecurrenteFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): FacturaVentaRecurrentePayload {
  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    fecha_vence: toIsoDate(raw.fecha_vence),
    plazo_pago: raw.plazo_pago?.id ?? null,
    sede: raw.sede?.id ?? null,
    metodo_pago: raw.metodo_pago?.id ?? null,
    // Texto en blanco = sin dato: el backend los declara nullable con
    // `minLength: 1`, así que un string vacío sería un 400.
    orden_compra: raw.orden_compra?.trim() || null,
    remision: raw.remision?.trim() || null,
    comentario: raw.comentario?.trim() || null,
    asesor: raw.asesor?.id ?? null,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
