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
 * Un POS es una factura de venta que además **se cobra en el acto**: la cabecera
 * es la misma (contacto, fechas, plazo, método de pago, sede) más asesor, orden de
 * compra y comentario. Los pagos no viajan en el documento: son un recurso propio
 * (`documento-pago`) que se registra contra el documento ya creado.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

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
  /** Suma de los pagos no anulados (`documento-pago`). La mantiene el backend. */
  readonly pago?: string | null;
  /** Lo que queda por cobrar. El backend lo fija al aprobar (`total − pago`). */
  readonly pendiente?: string | null;
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
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
