/**
 * Contratos de datos de la **cabecera** de Entrada de almacén.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`).
 *
 * Es de la familia inventario: sobre la cabecera base (contacto + fecha) solo
 * suma el **almacén** —la bodega por defecto de sus líneas— y el comentario.
 * No hay plazo/método de pago ni vencimiento: un movimiento de almacén no
 * genera cartera.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { InventarioDetallePayload } from '@erp/features/documentos/inventario/inventario-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una entrada. */
export interface EntradaRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** Bodega de la cabecera; precarga la de cada línea nueva. */
  readonly almacen: number | null;
  readonly almacen_nombre?: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de una entrada. */
export interface EntradaPayload extends DocumentoPayloadBase {
  readonly almacen: number | null;
  readonly comentario: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly InventarioDetallePayload[];
}
