/**
 * Contratos de datos de la **cabecera** de Asiento contable.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base`
 * en `@reddoc/core`), agregando solo los campos propios del asiento.
 *
 * La cabecera es corta: tercero, fecha, el soporte (el papel que respalda el
 * asiento), el comprobante donde se registra, el centro de costo opcional
 * y el comentario. No tiene vencimiento, plazo ni resolución — no es un
 * documento comercial.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { CuentaDetallePayload } from '@erp/features/documentos/contable/contable-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de un asiento. */
export interface AsientoRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Documento físico que respalda el asiento. */
  readonly soporte: string | null;
  /** Comprobante contable donde se registra el asiento. */
  readonly comprobante: number | null;
  readonly comprobante_nombre?: string | null;
  /** Centro de costo de la cabecera; siembra el de las líneas nuevas. */
  readonly centro_costo: number | null;
  readonly centro_costo_nombre?: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de un asiento. */
export interface AsientoPayload extends DocumentoPayloadBase {
  readonly soporte: string | null;
  readonly comprobante: number | null;
  readonly centro_costo: number | null;
  readonly comentario: string | null;
  /**
   * Neto de las líneas (`créditos − débitos`) como string con 2 decimales. En un
   * asiento cuadrado es `"0.00"`; el legacy manda exactamente esta cuenta.
   */
  readonly total: string;
  /**
   * Solo en alta: en edición las líneas transaccionan contra `documento-detalle`.
   * Todas son de cuenta contable (`tipo_registro: 'C'`) — un asiento no mueve ítems.
   */
  readonly detalles?: readonly CuentaDetallePayload[];
}
