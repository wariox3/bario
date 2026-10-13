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
}

/** Cómo le fue al lote: todos emitidos, algunos con error o ninguno. */
export type ResultadoEmision = 'exito' | 'parcial' | 'fallo';

export function clasificarEmision(resultado: EmitirResultado): ResultadoEmision {
  if (resultado.con_error.length === 0) return 'exito';
  return resultado.emitidos.length > 0 ? 'parcial' : 'fallo';
}
