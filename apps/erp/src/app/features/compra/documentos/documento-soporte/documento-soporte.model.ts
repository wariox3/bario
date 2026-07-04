/**
 * Contratos de datos de la **cabecera** de Documento soporte.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`).
 *
 * El documento soporte es de la familia comercial (mismas líneas ítem/cantidad/
 * precio que la factura de compra) y comparte su cabecera, sumando los campos
 * propios del soporte: forma de pago, resolución, orden de compra y comentario.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de un documento soporte. */
export interface DocumentoSoporteRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  readonly forma_pago: number | null;
  readonly forma_pago_nombre?: string | null;
  readonly resolucion: number | null;
  readonly resolucion_nombre?: string | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de un documento soporte. */
export interface DocumentoSoportePayload extends DocumentoPayloadBase {
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly sede: number | null;
  readonly metodo_pago: number | null;
  readonly forma_pago: number | null;
  readonly resolucion: number | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
