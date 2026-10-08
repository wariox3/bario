/**
 * Contratos de datos de la **cabecera** de Nota ajuste.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`).
 *
 * Es de la familia comercial (mismas líneas ítem/cantidad/precio que la factura
 * de compra) y suma a la cabecera el centro de costo, la orden de compra y el
 * comentario. El "grupo" del legacy es el centro de costo (`centro_costo`).
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una nota ajuste. */
export interface NotaAjusteRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  readonly centro_costo: number | null;
  readonly centro_costo_nombre?: string | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de una nota ajuste. */
export interface NotaAjustePayload extends DocumentoPayloadBase {
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly metodo_pago: number | null;
  readonly centro_costo: number | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
