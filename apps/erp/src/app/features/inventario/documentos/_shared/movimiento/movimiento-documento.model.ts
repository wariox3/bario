/**
 * Contratos de datos de la **cabecera** de un movimiento de inventario
 * (entrada, salida y traslado).
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`).
 *
 * Los tres documentos comparten cabecera: sobre la base (contacto + fecha) solo
 * suman el **almacén** —la bodega por defecto de sus líneas— y el comentario.
 * No hay plazo/método de pago ni vencimiento: un movimiento de almacén no
 * genera cartera. Lo único que los distingue es el `documento_tipo` del config.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { InventarioDetallePayload } from '@erp/features/documentos/inventario/inventario-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de un movimiento. */
export interface MovimientoRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Bodega de la cabecera; precarga la de cada línea nueva. */
  readonly almacen: number | null;
  readonly almacen_nombre?: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de un movimiento. */
export interface MovimientoPayload extends DocumentoPayloadBase {
  readonly almacen: number | null;
  readonly comentario: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly InventarioDetallePayload[];
}
