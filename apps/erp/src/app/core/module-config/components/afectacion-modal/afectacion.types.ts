/**
 * Dirección de trazabilidad de una línea en el modal de afectación.
 *
 * - `quien-lo-afecta` (aguas abajo): otras líneas cuyo `documento_detalle_afectado`
 *   apunta a esta → `listarPorAfectado(line.id)`.
 * - `a-quien-afecta` (aguas arriba): la línea origen que esta consume, contenida en
 *   su REF (`documento_detalle_afectado`) → `obtenerPorId(ref)`.
 */
export type AfectacionDireccion = 'quien-lo-afecta' | 'a-quien-afecta';

/**
 * Petición de afectación que emite una tabla de líneas al clickear un link.
 *
 * Desacoplada del tipo de línea (comercial vs servicio): solo lleva primitivos, así
 * ambas tablas emiten la misma forma y la ficha la reenvía tal cual al modal.
 */
export interface AfectacionRequest {
  /** PK de la línea clickeada (arma la cabecera del modal). */
  readonly lineId: number;
  /** REF de la línea (`documento_detalle_afectado`); alimenta la dirección "a quién afecta". */
  readonly afectadoId: number | null;
  /** Qué dirección de trazabilidad se consultó. */
  readonly direction: AfectacionDireccion;
}
