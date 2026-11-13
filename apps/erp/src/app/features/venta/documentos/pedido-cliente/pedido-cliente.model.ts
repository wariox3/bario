/**
 * Contratos de datos de la **cabecera** de Pedido de cliente.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo` (26). Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base` en
 * `@reddoc/core`), agregando solo lo propio del pedido de cliente.
 *
 * A diferencia de la factura de venta, la cabecera del pedido es **mínima**
 * (cliente, fecha y sede): no lleva plazo de pago, vencimiento ni método de
 * pago. Toda la sustancia está en las líneas comerciales.
 */
import type {
  DocumentoPayloadBase,
  DocumentoReadBase,
  DocumentoTotalesRead,
  ComercialDetallePayload,
} from '@reddoc/core';

/** Read-model (GET `/documento/:id/`) de la cabecera de un pedido de cliente. */
export interface PedidoClienteRead extends DocumentoReadBase, DocumentoTotalesRead {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly sede: number | null;
  /** Nombre de la sede para etiquetar el selector al cargar en edición. */
  readonly sede_nombre?: string | null;
}

/** Body (POST/PATCH) de un pedido de cliente. */
export interface PedidoClientePayload extends DocumentoPayloadBase {
  readonly sede: number | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
