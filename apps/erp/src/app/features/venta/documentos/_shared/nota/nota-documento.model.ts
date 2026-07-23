/**
 * Contratos de datos de la **cabecera** de las notas de venta: nota crédito (2)
 * y nota débito (3).
 *
 * Camino A del enfoque híbrido: los documentos viven sobre el endpoint genérico
 * `/api/general/documento` discriminado por `documento_tipo`. Las interfaces
 * **extienden** el contrato base común (`Documento*Base` en `@reddoc/core`). La
 * cabecera es idéntica entre crédito y débito: lo único que los distingue es el
 * `documento_tipo`, que aporta el `DocumentEntityConfig` de cada uno.
 *
 * Una nota de venta ajusta una **factura de venta** (`documento_referencia`) y,
 * como el POS, puede **cobrarse en el acto**: de ahí la lista de `pagos` (uno por
 * cuenta de banco). El resto de la cabecera es cliente, fecha, sede, método de
 * pago y comentario.
 *
 * Nota: la sección de pagos (shape `pagos`/`pago` embebido) es una **asunción de
 * contrato** calcada del legacy; pendiente de confirmar con el backend nuevo.
 */
import type { DocumentoPayloadBase, DocumentoReadBase } from '@reddoc/core';
import type { ComercialDetallePayload } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { PagoPayload, PagoRead } from '@erp/features/documentos/pagos/pago.model';

/** Read-model (GET `/documento/:id/`) de la cabecera de una nota de venta. */
export interface NotaVentaRead extends DocumentoReadBase {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  /** FK al documento (factura de venta) que la nota ajusta. */
  readonly documento_referencia: number | null;
  /** Número del documento referenciado (para pintar el select en edición). */
  readonly documento_referencia_numero?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  readonly comentario: string | null;
  /** Pagos recibidos al emitir la nota. */
  readonly pagos?: readonly PagoRead[] | null;
}

/** Body (POST/PATCH) de una nota de venta. */
export interface NotaVentaPayload extends DocumentoPayloadBase {
  readonly documento_referencia: number | null;
  readonly sede: number | null;
  readonly metodo_pago: number | null;
  readonly comentario: string | null;
  /** Total recibido en pagos (suma de `pagos[].pago`). */
  readonly pago: string;
  /** Pagos recibidos al emitir la nota. */
  readonly pagos: readonly PagoPayload[];
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
