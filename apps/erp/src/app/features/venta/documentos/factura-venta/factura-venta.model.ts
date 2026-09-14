/**
 * Contratos de datos de la **cabecera** de Factura de venta.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base`
 * en `@reddoc/core`), agregando solo los campos propios de la factura de venta.
 * Cubren solo la cabecera (los detalles/líneas llegan en otra iteración con la
 * tabla compartida de la familia comercial).
 *
 * Nota: `fecha_vence` es el nombre real del campo en el backend (ver
 * `DocumentoListRowBase`). Los demás nombres se confirman contra la API real.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { PagoPayload, PagoRead } from '@erp/features/documentos/pagos/pago.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una factura de venta. */
export interface FacturaVentaRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  /** Pagos recibidos (asunción de contrato: el backend aún no los expone). */
  readonly pagos?: readonly PagoRead[] | null;
}

/** Body (POST/PATCH) de una factura de venta. */
export interface FacturaVentaPayload extends DocumentoPayloadBase {
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly sede: number | null;
  readonly metodo_pago: number | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
  /** Total recibido (suma de `pagos[].pago`). */
  readonly pago: string;
  readonly pagos: readonly PagoPayload[];
}
