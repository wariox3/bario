import { documentoContactoToOption, fromIsoDate, toIsoDate } from '@reddoc/core';
import { comercialDetalleToPayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import { pagosToPayload } from '@erp/features/documentos/pagos/pago.mapper';
import type { NotaVentaPayload, NotaVentaRead } from './nota-documento.model';
import type { NotaVentaFormRawValue } from './nota-documento-form.types';

/**
 * Read-model (GET) → valores **escalares** de cabecera del formulario (edición).
 * No incluye `detalles` ni `pagos`: ambos viven en `FormArray` y se reconstruyen
 * aparte (los detalles vía `documento-detalle`, los pagos desde `read.pagos`).
 */
export function notaVentaToFormValue(
  read: NotaVentaRead,
): Partial<Omit<NotaVentaFormRawValue, 'detalles' | 'pagos'>> {
  return {
    contacto: documentoContactoToOption(read),
    fecha: fromIsoDate(read.fecha),
    documento_referencia:
      read.documento_referencia != null
        ? { id: read.documento_referencia, nombre: read.documento_referencia_numero ?? '' }
        : null,
    sede: read.sede != null ? { id: read.sede, nombre: read.sede_nombre ?? '' } : null,
    metodo_pago:
      read.metodo_pago != null
        ? { id: read.metodo_pago, nombre: read.metodo_pago_nombre ?? '' }
        : null,
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
  raw: NotaVentaFormRawValue,
  documentTypeId: number,
  includeDetalles = true,
): NotaVentaPayload {
  const comentario = raw.comentario?.trim() ?? '';

  return {
    documento_tipo: documentTypeId,
    contacto: raw.contacto?.id ?? null,
    fecha: toIsoDate(raw.fecha),
    documento_referencia: raw.documento_referencia?.id ?? null,
    sede: raw.sede?.id ?? null,
    metodo_pago: raw.metodo_pago?.id ?? null,
    comentario: comentario ? comentario : null,
    ...pagosToPayload(raw.pagos),
    ...(includeDetalles ? { detalles: raw.detalles.map(comercialDetalleToPayload) } : {}),
  };
}
