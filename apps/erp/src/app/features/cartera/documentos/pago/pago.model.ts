/**
 * Contratos de datos de la **cabecera** de Pago.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base`
 * en `@reddoc/core`), agregando solo los campos propios del pago.
 *
 * La cabecera del recaudo es corta: contacto, fecha, la cuenta banco donde entra
 * la plata, el comentario y el total (neto de las líneas). No tiene vencimiento,
 * plazo ni resolución — no es un documento comercial.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { CuentaDetallePayload } from '@erp/features/documentos/contable/contable-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de un pago. */
export interface PagoRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Cuenta bancaria que recibe el recaudo. */
  readonly cuenta_banco: number | null;
  readonly cuenta_banco_nombre?: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de un pago. */
export interface PagoPayload extends DocumentoPayloadBase {
  readonly cuenta_banco: number | null;
  readonly comentario: string | null;
  /** Neto del recaudo (`créditos − débitos`), como string con 2 decimales. */
  readonly total: string;
  /**
   * Solo en alta: en edición las líneas transaccionan contra `documento-detalle`.
   * Todas son de cuenta contable (`tipo_registro: 'C'`) — un pago no mueve ítems.
   */
  readonly detalles?: readonly CuentaDetallePayload[];
}
