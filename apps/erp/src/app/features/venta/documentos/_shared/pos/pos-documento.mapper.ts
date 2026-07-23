import { fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { PosDocumentoPayload, PosDocumentoRead } from './pos-documento.model';
import type { PosDocumentoFormRawValue } from './pos-documento-form.types';

/**
 * Read-model (GET) → valores **escalares** de cabecera del formulario (edición).
 * No incluye `detalles` ni `pagos`: ambos viven en `FormArray` y se reconstruyen
 * aparte (los detalles vía `documento-detalle`, los pagos desde `read.pagos`).
 */
export function posDocumentoToFormValue(
  read: PosDocumentoRead,
): Partial<Omit<PosDocumentoFormRawValue, 'detalles' | 'pagos'>> {
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
    asesor: read.asesor != null ? { id: read.asesor, nombre: read.asesor_nombre ?? '' } : null,
    orden_compra: read.orden_compra ?? null,
    comentario: read.comentario ?? null,
  };
}

/**
 * Valores del formulario → payload de la API.
 *
 * `documento_tipo` proviene del `documentTypeId` del `DocumentEntityConfig`.
 * En **edición** se omiten los detalles (`includeDetalles=false`): transaccionan
 * en vivo contra `documento-detalle`. En **alta** viajan embebidos. Los `pagos`
 * viajan siempre embebidos (asunción de contrato pendiente de confirmar).
 */
export function formValueToPayload(
  raw: PosDocumentoFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): PosDocumentoPayload {
  const comentario = raw.comentario?.trim() ?? '';
  const ordenCompra = raw.orden_compra?.trim() ?? '';
  const pagos = raw.pagos
    .filter((p) => p.cuenta_banco?.id != null)
    .map((p) => ({ cuenta_banco: p.cuenta_banco?.id ?? null, pago: (p.pago ?? 0).toFixed(2) }));
  const totalPagos = raw.pagos.reduce((acc, p) => acc + (p.pago ?? 0), 0);

  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    fecha_vence: toIsoDate(raw.fecha_vence),
    plazo_pago: raw.plazo_pago?.id ?? null,
    sede: raw.sede?.id ?? null,
    metodo_pago: raw.metodo_pago?.id ?? null,
    asesor: raw.asesor?.id ?? null,
    orden_compra: ordenCompra ? ordenCompra : null,
    comentario: comentario ? comentario : null,
    pago: totalPagos.toFixed(2),
    pagos,
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
