/**
 * Contratos de datos de la **cabecera** de Factura de compra recurrente.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo` (backend
 * "FACTURA COMPRA RECURRENTE", `documento_tipo_id = 32`). Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`).
 *
 * Es una **plantilla** de la familia comercial (mismas líneas ítem/cantidad/
 * precio que la factura de compra) desde la que luego se generan facturas reales.
 * Suma a la cabecera el plazo/forma de pago, el centro de costo, la sede, la
 * orden de compra y el comentario.
 */
import type {
  DocumentoPayloadBase,
  DocumentoReadBase,
  DocumentoTotalesRead,
  ComercialDetallePayload,
  ComercialDetalleRead,
} from '@reddoc/core';
import type {
  CuentaDetallePayload,
  CuentaDetalleRead,
} from '@erp/features/documentos/contable/contable-documento-detalle.model';

/**
 * Línea de la plantilla tal como la devuelve `documento-detalle`: como en la
 * factura de compra, mezcla líneas de ítem (comerciales) y de cuenta contable
 * (gastos fijos cargados directo a una cuenta: arriendo, servicios...),
 * discriminadas por `tipo_registro`.
 */
export type FacturaCompraRecurrenteLineaRead = ComercialDetalleRead & CuentaDetalleRead;

/** Read-model (GET `/documento/:id/`) de la cabecera de una factura de compra recurrente. */
export interface FacturaCompraRecurrenteRead extends DocumentoReadBase, DocumentoTotalesRead {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly forma_pago: number | null;
  readonly forma_pago_nombre?: string | null;
  readonly centro_costo: number | null;
  readonly centro_costo_nombre?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  /** Almacén general: el que heredan las líneas nuevas. */
  readonly almacen?: number | null;
  readonly almacen_nombre?: string | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de una factura de compra recurrente. */
export interface FacturaCompraRecurrentePayload extends DocumentoPayloadBase {
  readonly plazo_pago: number | null;
  readonly forma_pago: number | null;
  readonly centro_costo: number | null;
  readonly sede: number | null;
  readonly almacen: number | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /**
   * Solo en alta: en edición las líneas transaccionan contra `documento-detalle`.
   * Mezcla líneas de ítem y de cuenta contable; el backend las discrimina por
   * `tipo_registro`.
   */
  readonly detalles?: readonly (ComercialDetallePayload | CuentaDetallePayload)[];
}
