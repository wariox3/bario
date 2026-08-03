/**
 * Contrato de lectura del **movimiento contable**: la línea ya contabilizada del
 * libro, tal como la sirve el serializador `lista` de `contabilidad/movimiento/`.
 *
 * Los nombres llegan con **doble guion bajo** porque el serializador aplana las
 * relaciones (`contacto__nombre_corto`, `cuenta__codigo`…). Se conservan tal
 * cual: es una consulta de solo lectura, no hay formulario que mapear, y
 * renombrarlos obligaría a un mapper que solo existiría para maquillar.
 *
 * ⚠️ Contrato **supuesto** a partir del ERP legacy (nombres y tipos), sin
 * verificar contra el backend.
 */
export interface Movimiento {
  readonly id: number;
  /** Consecutivo del documento que originó el movimiento. */
  readonly numero: number | null;
  readonly fecha: string | null;
  readonly comprobante__nombre: string | null;
  readonly contacto__nombre_corto: string | null;
  /** Código de la cuenta imputada (no su id). */
  readonly cuenta__codigo: string | null;
  /**
   * Centro de costo. El backend lo llama `grupo` porque así se llamaba en el ERP
   * anterior; en este ERP el concepto es el centro de costo.
   */
  readonly grupo__nombre: string | null;
  readonly debito: string | number | null;
  readonly credito: string | number | null;
  readonly base: string | number | null;
  readonly detalle: string | null;
}
