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
import type { ErpSelectOption } from '../../data';
import type {
  DocumentoPayloadBase,
  DocumentoReadBase,
  DocumentoTotalesRead,
} from '../documento.types';
import type { ComercialDetallePayload } from '../comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '../comercial/comercial-documento-detalle.types';

/** Read-model (GET `/documento/:id/`) de la cabecera de un documento POS. */
export interface PosDocumentoRead extends DocumentoReadBase, DocumentoTotalesRead {
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
  readonly asesor: number | null;
  readonly asesor_nombre?: string | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /** CUE con el que la DIAN validó la factura (solo la POS electrónica); vacío hasta que se emite. */
  readonly cue?: string | null;
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
  readonly almacen: number | null;
  readonly metodo_pago: number | null;
  readonly asesor: number | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  /** Lo manda la caja del POS; el form del ERP no lo edita y lo omite. */
  readonly soporte?: string | null;
  /** Solo en alta: en edición las líneas transaccionan contra `documento-detalle`. */
  readonly detalles?: readonly ComercialDetallePayload[];
}

/**
 * Valores de cabecera y líneas de un documento POS, ya elegidos por quien vende
 * (`fecha` y `fecha_vence` como `Date`, los selects como opción completa). Es lo
 * que necesita {@link posDocumentoToPayload}: el formulario del ERP lo extiende
 * con sus pagos y la caja del POS lo arma desde el carrito.
 */
export interface PosDocumentoValores {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly fecha_vence: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly almacen: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  readonly asesor: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
