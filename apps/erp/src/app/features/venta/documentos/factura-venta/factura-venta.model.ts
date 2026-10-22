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
import type {
  DocumentoPayloadBase,
  DocumentoReadBase,
  DocumentoTotalesRead,
  ComercialDetallePayload,
} from '@reddoc/core';

/** Read-model (GET `/documento/:id/`) de la cabecera de una factura de venta. */
export interface FacturaVentaRead extends DocumentoReadBase, DocumentoTotalesRead {
  /** Número (consecutivo) del documento que asigna el backend. */
  readonly numero: string | null;
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly plazo_pago_nombre?: string | null;
  readonly sede: number | null;
  readonly sede_nombre?: string | null;
  /** Almacén general: el que heredan las líneas nuevas. */
  readonly almacen?: number | null;
  readonly almacen_nombre?: string | null;
  readonly metodo_pago: number | null;
  readonly metodo_pago_nombre?: string | null;
  readonly orden_compra?: string | null;
  readonly remision?: string | null;
  readonly comentario?: string | null;
  readonly asesor?: number | null;
  readonly asesor_nombre?: string | null;
  readonly resolucion?: number | null;
  /** La etiqueta se arma con prefijo y número (`resolucionLabel`): el read no trae nombre. */
  readonly resolucion_prefijo?: string | null;
  readonly resolucion_numero?: string | null;
  /**
   * CUE con el que la DIAN validó la factura electrónica (solo lectura en
   * `GenDocumento`); vacío hasta que se emite.
   */
  readonly cue?: string | null;
  /** Suma de los pagos no anulados (`documento-pago`). La mantiene el backend. */
  readonly pago?: string | null;
  /** Lo que queda por cobrar. El backend lo fija al aprobar (`total − pago`). */
  readonly pendiente?: string | null;
}

/** Body (POST/PATCH) de una factura de venta. */
export interface FacturaVentaPayload extends DocumentoPayloadBase {
  readonly fecha_vence: string | null;
  readonly plazo_pago: number | null;
  readonly sede: number | null;
  readonly almacen: number | null;
  readonly metodo_pago: number | null;
  readonly orden_compra: string | null;
  readonly remision: string | null;
  readonly comentario: string | null;
  readonly asesor: number | null;
  readonly resolucion: number | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}
