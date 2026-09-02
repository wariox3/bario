/**
 * Contratos de datos de la **cabecera** de Factura de venta recurrente.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo` (16). La recurrente
 * es la **plantilla** de la factura de venta, así que comparte exactamente su
 * cabecera: las interfaces **extienden** el contrato base común a cualquier
 * documento (`Documento*Base` en `@reddoc/core`) agregando solo los campos
 * propios de la familia comercial de venta.
 *
 * Nota: `fecha_vence` es el nombre real del campo en el backend (ver
 * `DocumentoListRowBase`). Los demás nombres se confirman contra la API real.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una factura de venta recurrente. */
export interface FacturaVentaRecurrenteRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Identificación del cliente, resuelta por el backend desde el contacto. */
  readonly tercero_numero_identificacion?: string | null;
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  readonly orden_compra: string | null;
  readonly remision: string | null;
  readonly comentario: string | null;
  /**
   * Asesor asignado. El read trae **solo la FK**: a diferencia de plazo de pago,
   * sede o método de pago, el serializer todavía no manda `asesor_nombre_corto`,
   * así que quien necesite mostrarlo resuelve el nombre contra
   * `SELECT_ENDPOINTS.asesor`. Cuando el backend lo serialice, esa consulta sobra.
   */
  readonly asesor: number | null;
}

/** Body (POST/PATCH) de una factura de venta recurrente. */
export interface FacturaVentaRecurrentePayload extends DocumentoPayloadBase {
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly sede: number | null;
  readonly metodo_pago: number | null;
  readonly orden_compra: string | null;
  readonly remision: string | null;
  readonly comentario: string | null;
  readonly asesor: number | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
