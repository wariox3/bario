/**
 * Contratos de datos de la **cabecera** de Pedido de cliente.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo` (26). Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base` en
 * `@reddoc/core`), agregando solo lo propio del pedido de cliente.
 *
 * A diferencia de la factura de venta, la cabecera del pedido es **mínima**
 * (cliente + fecha, fiel al legacy): no lleva plazo de pago, vencimiento, método
 * de pago ni sede. Toda la sustancia está en las líneas comerciales.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de un pedido de cliente. */
export interface PedidoClienteRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
}

/** Body (POST/PATCH) de un pedido de cliente. */
export interface PedidoClientePayload extends DocumentoPayloadBase {
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
