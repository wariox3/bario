/**
 * Contratos de datos de la **cabecera** de Remisión.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo` (29). Las interfaces
 * **extienden** el contrato base común a cualquier documento (`Documento*Base` en
 * `@reddoc/core`), agregando lo propio de la remisión.
 *
 * La remisión es una **entrega física** (mueve inventario): de ahí el campo
 * `almacen`. La cabecera replica lo que renderiza el legacy: cliente, fecha, sede,
 * almacén, asesor y comentario. Sin plazo/vencimiento/método de pago.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una remisión. */
export interface RemisionRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  readonly almacen: number | null;
  readonly almacen_nombre?: string | null;
  readonly asesor: number | null;
  readonly asesor_nombre?: string | null;
  readonly comentario: string | null;
}

/** Body (POST/PATCH) de una remisión. */
export interface RemisionPayload extends DocumentoPayloadBase {
  readonly sede: number | null;
  readonly almacen: number | null;
  readonly asesor: number | null;
  readonly comentario: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
