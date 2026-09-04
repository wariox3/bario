import type { DocumentoDetallePayloadBase, DocumentoDetalleReadBase } from '@reddoc/core';

/**
 * Modelos de lectura/escritura de una línea de detalle **comercial**, comunes a
 * todos los documentos comerciales (factura venta/compra, notas). Extienden el
 * contrato base de líneas (`DocumentoDetalle*Base` en `@reddoc/core`) agregando
 * solo los campos propios del comercial: descuento y la nota libre.
 *
 * Sobre el descuento (confirmado contra el esquema de la API,
 * `GenDocumentoDetalle`): lo que se **escribe** es `porcentaje_descuento`. El
 * campo `descuento` es de **solo lectura** y trae el **monto** que calculó el
 * backend, igual que `subtotal`, `total_bruto`, `base_impuesto` e `impuesto`.
 * Mandar el porcentaje en `descuento` es un no-op silencioso: DRF descarta el
 * campo read-only y el documento se queda con sus totales anteriores.
 */

/** Línea de detalle comercial leída desde la API en edición. */
export interface ComercialDetalleRead extends DocumentoDetalleReadBase {
  /** Porcentaje de descuento de la línea (string con decimales, p. ej. `"10.00"`). */
  readonly porcentaje_descuento?: string | number | null;
  /**
   * **Monto** del descuento que calculó el backend (read-only). No es el
   * porcentaje: quien necesite el porcentaje lee `porcentaje_descuento`.
   */
  readonly descuento?: string | number | null;
  readonly detalle?: string | null;
  /**
   * Almacén de la línea. **Asunción de contrato**: `GenDocumentoDetalle` no la
   * declara en el OpenAPI (verificado el 2026-09-03), así que hoy el backend la
   * descarta en silencio al guardar y no vuelve en el read. El campo queda
   * cableado para cuando el serializer lo sume; mientras tanto la columna se ve
   * y se edita, pero no persiste. Mismo estado que el almacén de las líneas de
   * inventario.
   */
  readonly almacen?: number | null;
  /** Nombre del almacén, para etiquetar el select al cargar en edición. */
  readonly almacen_nombre?: string | null;
  /** Línea origen afectada, si la línea provino de "importar desde documento". */
  readonly documento_detalle_afectado?: number | null;
}

/** Cuerpo de una línea de detalle comercial enviada en `POST`/`PATCH`. */
export interface ComercialDetallePayload extends DocumentoDetallePayloadBase {
  /** Porcentaje de descuento como string con 2 decimales (`"10.00"`). */
  readonly porcentaje_descuento: string;
  readonly detalle: string | null;
  /** Almacén de la línea; ver la nota de `almacen` en el read. */
  readonly almacen: number | null;
  /** Línea origen afectada (importar desde documento); `null` en líneas normales. */
  readonly documento_detalle_afectado: number | null;
}
