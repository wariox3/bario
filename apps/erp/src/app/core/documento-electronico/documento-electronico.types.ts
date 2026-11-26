/**
 * Error de un intento de emisión (`GenDocumentoElectronicoError`). Cada intento
 * reemplaza los errores del anterior.
 */
export interface DocumentoElectronicoError {
  readonly id: number;
  readonly documento: number;
  readonly fase: 'validacion' | 'emision';
  readonly mensaje: string;
  readonly fecha: string;
}

/**
 * Respuesta de `general/documento/emitir/`. Cada documento va por su cuenta:
 * uno que falla no detiene a los demás, así que el 200 no dice que todo salió
 * bien. Los motivos no vienen acá: el documento queda con
 * `estado_electronico_error` y se leen en `documento-electronico-error/lista/`.
 */
export interface EmitirResultado {
  readonly emitidos: readonly number[];
  readonly con_error: readonly number[];
  /**
   * Enviadas sin veredicto de la DIAN (solo nómina). Solo viene si hay alguna;
   * reemitirlas más tarde consulta cómo les fue.
   */
  readonly pendientes?: readonly number[];
}

/**
 * Cómo le fue al lote: todos emitidos, algunos con error, ninguno, o sin error
 * pero con alguno aún esperando a la DIAN.
 */
export type ResultadoEmision = 'exito' | 'pendiente' | 'parcial' | 'fallo';

export function clasificarEmision(resultado: EmitirResultado): ResultadoEmision {
  const pendientes = resultado.pendientes?.length ?? 0;
  if (resultado.con_error.length === 0) return pendientes > 0 ? 'pendiente' : 'exito';
  return resultado.emitidos.length > 0 || pendientes > 0 ? 'parcial' : 'fallo';
}
