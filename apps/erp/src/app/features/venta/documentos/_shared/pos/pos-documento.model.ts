/**
 * Contratos de datos de la **cabecera** de los documentos POS (punto de venta):
 * factura POS (27) y factura POS electrónica (24).
 *
 * Camino A del enfoque híbrido: los documentos viven sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`),
 * agregando lo propio del POS. La cabecera es idéntica entre los documentos de
 * la familia: lo único que los distingue es el `documento_tipo`, que aporta el
 * `DocumentEntityConfig` de cada uno.
 *
 * Un POS es una factura de venta que además **se cobra en el acto**: de ahí la
 * lista de `pagos` (uno por cuenta de banco) que no tiene la factura de venta
 * normal. Fuera de eso la cabecera es la misma (contacto, fechas, plazo, método
 * de pago, sede) más asesor, orden de compra y comentario.
 *
 * Nota: la sección de pagos (`pagos`/`pago`) es una **asunción de contrato**
 * calcada del legacy (`{ cuenta_banco, pago }` embebido en el payload del
 * documento); pendiente de confirmar el shape real con el backend nuevo.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Pago del POS leído desde la API (una fila de la tabla de pagos). */
export interface PagoRead {
  readonly id: number | null;
  readonly cuenta_banco: number | null;
  readonly cuenta_banco_nombre?: string | null;
  /** Monto del pago como string con cola de decimales (`"50000.00"`). */
  readonly pago: string | number | null;
}

/** Read-model (GET `/documento/:id/`) de la cabecera de un documento POS. */
export interface PosDocumentoRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  readonly asesor: number | null;
  readonly asesor_nombre?: string | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /** Pagos recibidos en el punto de venta. */
  readonly pagos?: readonly PagoRead[] | null;
}

/** Body (POST/PATCH) de un pago del POS. */
export interface PagoPayload {
  readonly cuenta_banco: number | null;
  /** Monto como string con 2 decimales (`"50000.00"`). */
  readonly pago: string;
}

/** Body (POST/PATCH) de un documento POS. */
export interface PosDocumentoPayload extends DocumentoPayloadBase {
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly sede: number | null;
  readonly metodo_pago: number | null;
  readonly asesor: number | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /** Total recibido en pagos (suma de `pagos[].pago`). */
  readonly pago: string;
  /** Pagos del punto de venta. */
  readonly pagos: readonly PagoPayload[];
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
