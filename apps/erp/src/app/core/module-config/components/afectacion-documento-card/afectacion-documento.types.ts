/**
 * Cabecera de documento (`documento/<id>/`), recortada a lo que pintan los modales
 * de afectación. Los montos llegan como string con decimales, de ahí
 * `string | number | null`.
 */
export interface AfectacionDocumentoRead {
  readonly id?: number | null;
  readonly numero?: string | number | null;
  readonly fecha?: string | null;
  readonly contacto_nombre_corto?: string | null;
  readonly documento_tipo_nombre?: string | null;
  /** FK al documento de referencia (origen). Algunos serializadores lo exponen con `_id`. */
  readonly documento_referencia?: number | null;
  readonly documento_referencia_id?: number | null;
  readonly subtotal?: string | number | null;
  readonly base_impuesto?: string | number | null;
  readonly impuesto?: string | number | null;
  readonly total?: string | number | null;
}
