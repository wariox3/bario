/**
 * Contratos de datos de la **cabecera** de Nota débito de compra.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo` (backend
 * "NOTA DEBITO COMPRA", `documento_tipo_id = 7`). Las interfaces **extienden**
 * el contrato base común (`Documento*Base` en `@reddoc/core`).
 *
 * Es de la familia comercial (mismas líneas ítem/cantidad/precio que la factura
 * de compra) y suma a la cabecera el **documento de referencia** (la factura de
 * compra que la nota ajusta), el centro de costo y el comentario.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una nota débito de compra. */
export interface NotaDebitoCompraRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** FK al documento (factura de compra) que la nota débito referencia. */
  readonly documento_referencia: number | null;
  /** Número del documento referenciado (para pintar el select en edición). */
  readonly documento_referencia_numero?: string | null;
  readonly centro_costo: number | null;
  readonly centro_costo_nombre?: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de una nota débito de compra. */
export interface NotaDebitoCompraPayload extends DocumentoPayloadBase {
  readonly documento_referencia: number | null;
  readonly centro_costo: number | null;
  readonly comentario: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
